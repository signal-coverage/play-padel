import { MercadoPagoConfig } from "mercadopago";
import { prisma } from "@/infrastructure/db/client";
import { decryptToken, encryptToken } from "./tokenCrypto";
import { refreshClubAccessToken } from "./oauth";

// How far ahead of `tokenExpiresAt` this module proactively refreshes a
// club's access token on read. Deliberately wider than the daily background
// refresh cron's own window (Phase 6) so an active club's token is refreshed
// here well before the cron would ever need to catch it — the cron is only
// a backstop for dormant clubs that don't make any MP calls for a while.
export const LAZY_REFRESH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export class ClubMercadoPagoConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClubMercadoPagoConnectionError";
  }
}

// Bounded request timeout + retry budget for every club-scoped client. The
// installed SDK otherwise defaults to a 60s per-attempt timeout with up to 3
// retries and exponential backoff (see `mercadopago`'s
// `AppConfig.DEFAULT_TIMEOUT` / `DEFAULT_RETRIES`) — on a partial Mercado
// Pago outage that lets a single call hang for 60-150+ seconds. This client
// is used both from the synchronous checkout-creation path (a player's "pay"
// click — see `preferences.ts`) and from async webhook payment lookups (see
// `payments.ts`); both share this one conservative budget rather than
// threading a per-context config through call sites this fix must not touch.
export const CLUB_CLIENT_TIMEOUT_MS = 5000;
export const CLUB_CLIENT_MAX_RETRIES = 1;

function isNearExpiry(tokenExpiresAt: Date | null): boolean {
  if (!tokenExpiresAt) return false;
  return tokenExpiresAt.getTime() - Date.now() <= LAZY_REFRESH_WINDOW_MS;
}

// Per-club in-flight refresh de-duplication. Mercado Pago's refresh tokens
// are single-use/rotating, so two concurrent callers that both observe
// `isNearExpiry === true` for the same club must not each start their own
// `refreshAndPersist` — the loser would replay an already-rotated refresh
// token, fail, and incorrectly mark a healthy, still-connected club
// NOT_CONNECTED because of a benign request race. Instead, the second caller
// awaits the SAME in-flight promise as the first. The entry is removed once
// the refresh settles (success or failure) so a later, genuinely new refresh
// cycle isn't permanently blocked by a stale map entry.
const inFlightRefreshes = new Map<string, Promise<string>>();

function getOrStartRefresh(
  clubId: string,
  refreshTokenEncrypted: string,
): Promise<string> {
  const existing = inFlightRefreshes.get(clubId);
  if (existing) return existing;

  const refreshPromise = refreshAndPersist(
    clubId,
    refreshTokenEncrypted,
  ).finally(() => {
    inFlightRefreshes.delete(clubId);
  });
  inFlightRefreshes.set(clubId, refreshPromise);
  return refreshPromise;
}

// Arbitrary fixed namespace (first key of the two-key `pg_advisory_xact_lock`
// form) for this lock category, so it can never collide with an advisory
// lock taken for an unrelated purpose elsewhere. The second key is derived
// from the club id via Postgres's own `hashtext()` so we don't need a custom
// JS-side hash that could drift from the SQL-side one.
const MP_REFRESH_LOCK_NAMESPACE = 785001;

type RefreshOutcome =
  { ok: true; accessToken: string } | { ok: false; message: string };

/**
 * Refreshes a club's Mercado Pago access token and persists the result:
 * on success, stores the new encrypted access/refresh tokens + expiry; on
 * failure, marks the account `NOT_CONNECTED` with `disconnectedAt` and
 * `lastRefreshError` set, then rethrows `ClubMercadoPagoConnectionError`.
 *
 * Used by both the lazy refresh path below (`getClubMercadoPagoClient`,
 * single club, on read) and the daily background cron backstop
 * (`app/api/cron/mercadopago-token-refresh/route.ts`, batch, all clubs
 * nearing expiry) — see design.md's "Token refresh strategy" decision.
 * Exported so both call sites share the exact same success/failure
 * persistence logic instead of diverging.
 *
 * Cross-instance safety: `inFlightRefreshes` above only dedupes concurrent
 * callers within ONE warm serverless instance. Under Vercel Fluid Compute,
 * two different concurrent instances each have their own empty map, so both
 * could otherwise call this function for the same club at once. Mercado
 * Pago's refresh tokens are single-use/rotating, so the loser would replay
 * an already-rotated token and fail, incorrectly marking a healthy club
 * NOT_CONNECTED. To prevent that, the whole critical section below runs
 * inside one Postgres-level advisory lock scoped to `clubId` (visible to
 * every instance, unlike the in-memory map) via a single Prisma interactive
 * transaction — `pg_advisory_xact_lock` auto-releases when the transaction
 * ends, so there is no separate unlock step to forget on error or crash.
 * After acquiring the lock, the account row is re-read: if a concurrent
 * winner already rotated the token while this caller was waiting, the fresh
 * token it persisted is returned directly instead of racing a second
 * refresh call against the now-stale refresh token.
 */
export async function refreshAndPersist(
  clubId: string,
  refreshTokenEncrypted: string,
): Promise<string> {
  const outcome = await prisma.$transaction(
    async (tx): Promise<RefreshOutcome> => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${MP_REFRESH_LOCK_NAMESPACE}, hashtext(${clubId}))`;

      const current = await tx.clubMercadoPagoAccount.findUnique({
        where: { clubId },
      });

      if (
        current?.accessTokenEncrypted &&
        !isNearExpiry(current.tokenExpiresAt)
      ) {
        // A concurrent instance already refreshed + persisted a new token
        // pair while we were waiting for the lock. Use it instead of
        // replaying the now-rotated refresh token.
        return {
          ok: true,
          accessToken: decryptToken(current.accessTokenEncrypted),
        };
      }

      const refreshToken = decryptToken(
        current?.refreshTokenEncrypted ?? refreshTokenEncrypted,
      );

      let refreshed;
      try {
        refreshed = await refreshClubAccessToken(refreshToken);
      } catch (err) {
        await tx.clubMercadoPagoAccount.update({
          where: { clubId },
          data: {
            status: "NOT_CONNECTED",
            disconnectedAt: new Date(),
            lastRefreshError: err instanceof Error ? err.message : String(err),
          },
        });
        return {
          ok: false,
          message: `Failed to refresh Mercado Pago token for club ${clubId}`,
        };
      }

      if (!refreshed.access_token || !refreshed.refresh_token) {
        await tx.clubMercadoPagoAccount.update({
          where: { clubId },
          data: {
            status: "NOT_CONNECTED",
            disconnectedAt: new Date(),
            lastRefreshError:
              "Mercado Pago refresh response was missing tokens",
          },
        });
        return {
          ok: false,
          message: `Mercado Pago refresh response for club ${clubId} was missing tokens`,
        };
      }

      await tx.clubMercadoPagoAccount.update({
        where: { clubId },
        data: {
          accessTokenEncrypted: encryptToken(refreshed.access_token),
          refreshTokenEncrypted: encryptToken(refreshed.refresh_token),
          tokenExpiresAt: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000)
            : null,
          lastRefreshError: null,
        },
      });

      return { ok: true, accessToken: refreshed.access_token };
    },
    // The transaction body makes an external HTTP call to Mercado Pago and
    // can also wait behind another instance's same-club lock, so the
    // interactive-transaction timeout needs real headroom beyond Prisma's
    // 5s default — 20s comfortably covers normal refresh latency plus a
    // lock wait without leaving the advisory lock held indefinitely.
    { timeout: 20000, maxWait: 10000 },
  );

  // Thrown OUTSIDE the transaction (not from within the callback above) so
  // a failure's NOT_CONNECTED write still commits instead of being rolled
  // back by the very error that would otherwise abort the transaction.
  if (!outcome.ok) {
    throw new ClubMercadoPagoConnectionError(outcome.message);
  }
  return outcome.accessToken;
}

/**
 * Resolves a club's Mercado Pago SDK client from its stored, encrypted
 * OAuth tokens (see `ClubMercadoPagoAccount` in prisma/schema.prisma).
 *
 * Every checkout-related MP call (preference creation, payment lookup,
 * refunds) must go through this function instead of a shared platform
 * token — see design.md's "club-scoped client" decision.
 */
export async function getClubMercadoPagoClient(
  clubId: string,
): Promise<MercadoPagoConfig> {
  const account = await prisma.clubMercadoPagoAccount.findUnique({
    where: { clubId },
  });

  if (
    !account ||
    account.status !== "CONNECTED" ||
    !account.accessTokenEncrypted ||
    !account.refreshTokenEncrypted
  ) {
    throw new ClubMercadoPagoConnectionError(
      `Club ${clubId} does not have a valid Mercado Pago connection`,
    );
  }

  let accessToken: string;
  if (isNearExpiry(account.tokenExpiresAt)) {
    accessToken = await getOrStartRefresh(
      clubId,
      account.refreshTokenEncrypted,
    );
  } else {
    accessToken = decryptToken(account.accessTokenEncrypted);
  }

  return new MercadoPagoConfig({
    accessToken,
    options: {
      timeout: CLUB_CLIENT_TIMEOUT_MS,
      maxRetries: CLUB_CLIENT_MAX_RETRIES,
    },
  });
}

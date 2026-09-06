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
 */
export async function refreshAndPersist(
  clubId: string,
  refreshTokenEncrypted: string,
): Promise<string> {
  const refreshToken = decryptToken(refreshTokenEncrypted);

  let refreshed;
  try {
    refreshed = await refreshClubAccessToken(refreshToken);
  } catch (err) {
    await prisma.clubMercadoPagoAccount.update({
      where: { clubId },
      data: {
        status: "NOT_CONNECTED",
        disconnectedAt: new Date(),
        lastRefreshError: err instanceof Error ? err.message : String(err),
      },
    });
    throw new ClubMercadoPagoConnectionError(
      `Failed to refresh Mercado Pago token for club ${clubId}`,
    );
  }

  if (!refreshed.access_token || !refreshed.refresh_token) {
    await prisma.clubMercadoPagoAccount.update({
      where: { clubId },
      data: {
        status: "NOT_CONNECTED",
        disconnectedAt: new Date(),
        lastRefreshError: "Mercado Pago refresh response was missing tokens",
      },
    });
    throw new ClubMercadoPagoConnectionError(
      `Mercado Pago refresh response for club ${clubId} was missing tokens`,
    );
  }

  await prisma.clubMercadoPagoAccount.update({
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

  return refreshed.access_token;
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

  return new MercadoPagoConfig({ accessToken });
}

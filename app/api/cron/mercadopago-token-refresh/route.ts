import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { refreshAndPersist } from "@/lib/mercadopago/clubMercadoPagoClient";
import { logSystemJob } from "@/core/systemJobs/services/systemJobs.service";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";

// Wider than `LAZY_REFRESH_WINDOW_MS` (3 days, see clubMercadoPagoClient.ts)
// on purpose: this cron is only a backstop for dormant clubs that don't make
// any Mercado Pago calls for a while. An active club's token will already
// have been refreshed lazily well before this window opens, so this job
// mostly re-touches the same clubs the lazy path already handled — that's
// fine, `refreshAndPersist` is idempotent per successful call.
export const CRON_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Triggered by Vercel Cron (see vercel.json, daily). Not a Clerk session —
// proxy.ts allowlists this route and this bearer check is the only auth,
// matching Vercel's documented CRON_SECRET pattern (same convention as
// app/api/cron/notifications/route.ts).
export async function GET(request: Request) {
  const unauthorized = await requireCronSecret(
    request,
    "mercadopago-token-refresh",
  );
  if (unauthorized) return unauthorized;

  // Started only after the auth check passes — an unauthorized probe should
  // never pollute the system job history (see core/systemJobs).
  const startedAt = new Date();
  try {
    const dueForRefresh = await prisma.clubMercadoPagoAccount.findMany({
      where: {
        status: "CONNECTED",
        refreshTokenEncrypted: { not: null },
        tokenExpiresAt: {
          not: null,
          lte: new Date(Date.now() + CRON_REFRESH_WINDOW_MS),
        },
      },
      select: { clubId: true, refreshTokenEncrypted: true },
    });

    let refreshed = 0;
    let failed = 0;

    for (const account of dueForRefresh) {
      try {
        // refreshTokenEncrypted is guaranteed non-null by the query filter
        // above.
        await refreshAndPersist(account.clubId, account.refreshTokenEncrypted!);
        refreshed++;
      } catch {
        // `refreshAndPersist` already marks the account NOT_CONNECTED and
        // records lastRefreshError (see ClubMercadoPagoConnectionError) before
        // rethrowing — this batch job just needs to not let one club's
        // failure abort the rest of the run.
        failed++;
      }
    }

    await logSystemJob({
      kind: "CRON",
      name: "mercadopago-token-refresh",
      status: "SUCCESS",
      startedAt,
      finishedAt: new Date(),
    });

    return NextResponse.json({
      checked: dueForRefresh.length,
      refreshed,
      failed,
    });
  } catch (err) {
    await logSystemJob({
      kind: "CRON",
      name: "mercadopago-token-refresh",
      status: "FAILURE",
      startedAt,
      finishedAt: new Date(),
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

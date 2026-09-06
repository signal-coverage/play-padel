import { NextResponse } from "next/server";
import { logSystemJob } from "@/core/systemJobs/services/systemJobs.service";

/**
 * Shared Vercel Cron bearer-secret gate (see app/api/cron/notifications and
 * app/api/cron/mercadopago-token-refresh, which both used to duplicate this
 * exact check inline). Distinguishes two failure modes that a bare
 * `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` comparison
 * conflates:
 *
 * - CRON_SECRET genuinely unset: `process.env.CRON_SECRET` is `undefined`,
 *   so the comparison degrades to matching the literal string
 *   `"Bearer undefined"` — still fails closed (safe), but silently, with no
 *   signal that the DEPLOY is misconfigured rather than that a caller sent
 *   the wrong secret. This logs a FAILURE system job (so it shows up in the
 *   existing admin System Status panel) and returns 500, not 401.
 * - CRON_SECRET is set but the caller's bearer token doesn't match: a normal
 *   unauthorized request (e.g. a random prober) — 401, and deliberately NOT
 *   logged as a system job (an unauthorized probe should never pollute that
 *   history, same reasoning each cron route's own comment already states
 *   for its real work).
 *
 * Returns `null` when authorized, matching the same `NextResponse | null`
 * convention as `lib/auth/admin.ts`'s `requireAdmin()`.
 */
export async function requireCronSecret(
  request: Request,
  jobName: string,
): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    const now = new Date();
    await logSystemJob({
      kind: "CRON",
      name: jobName,
      status: "FAILURE",
      startedAt: now,
      finishedAt: now,
      errorMessage: "CRON_SECRET is not set",
    });
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

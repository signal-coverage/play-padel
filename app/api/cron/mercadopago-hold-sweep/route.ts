import { NextResponse } from "next/server";
import { logSystemJob } from "@/core/systemJobs/services/systemJobs.service";
import { sweepLapsedMercadoPagoHolds } from "@/core/reservations/services/mercadoPagoHoldSweep.service";

// Triggered by Vercel Cron (see vercel.json). Not a Clerk session — proxy.ts
// already allowlists /api/cron/(.*) — this bearer check is the only auth,
// same convention as bank-transfer-hold-sweep/route.ts.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Started only after the auth check passes — an unauthorized probe should
  // never pollute the system job history (see core/systemJobs).
  const startedAt = new Date();
  try {
    return await runSweep(startedAt);
  } catch (err) {
    await logSystemJob({
      kind: "CRON",
      name: "mercadopago-hold-sweep",
      status: "FAILURE",
      startedAt,
      finishedAt: new Date(),
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// Backstop for the lazy-expiry mechanism in reservations.service.ts: that
// mechanism only fires the next time some read path (My Reservations, the
// owner's reservation list/detail, a stream poll) actually touches the row —
// a hold nobody ever comes back to look at would otherwise linger SCHEDULED
// forever. Vercel Hobby's cron can only run once/day, so unlike that lazy
// path this is not the primary mechanism — it exists purely to guarantee
// both the player is told AND the row eventually reaches a terminal status,
// for the case where nothing else ever reads it again. The actual sweep
// logic lives in core/reservations/services/mercadoPagoHoldSweep.service.ts
// so scripts/actions/force-mp-hold-sweep.ts can trigger it manually too.
async function runSweep(startedAt: Date): Promise<NextResponse> {
  const { notified, failed } = await sweepLapsedMercadoPagoHolds();

  await logSystemJob({
    kind: "CRON",
    name: "mercadopago-hold-sweep",
    status: "SUCCESS",
    startedAt,
    finishedAt: new Date(),
  });

  return NextResponse.json({ notified, failed });
}

import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { computePerformanceSummaryForPlayer } from "@/core/tournaments/services/standings.service";

// Real data behind PlayerOverview's Performance Summary card (see
// PlayerOverview/hooks.ts's usePerformanceSummary) -- gated requireAuthUser()
// only, same as every other player-facing tournament route (no home club, no
// club scoping -- see the plan's "no home club" reasoning). Always returns
// the caller's own data; never accepts a target player id.
export async function GET() {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;

  const performance = await computePerformanceSummaryForPlayer(
    authResult.userId,
  );
  return NextResponse.json({ performance });
}

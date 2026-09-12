import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { getCategoryStandingsDetail } from "@/core/tournaments/services/standings.service";

type RouteParams = {
  params: Promise<{ tournamentId: string; categoryId: string }>;
};

// Global (cross-club) read — gated requireAuthUser() only, same as every
// other player-facing tournament route (see the plan's "no home club"
// reasoning). Groups/standings/matches + the knockout bracket (once it
// exists) as plain data — no bracket graphic, per the plan.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;

  const { categoryId } = await params;
  const detail = await getCategoryStandingsDetail(categoryId);
  if (!detail) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

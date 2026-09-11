import { NextResponse, type NextRequest } from "next/server";
import { listTeamsForCategoryWithPlayers } from "@/core/tournaments/services/tournamentTeams.service";
import { requireOwnerClub } from "../../../../../_lib/require-owner";
import { findOwnedCategory } from "../../../../../_lib/find-owned-category";

type RouteParams = {
  params: Promise<{ tournamentId: string; categoryId: string }>;
};

// Read-only, owner-scoped. Not part of the plan's original explicit route
// list — added so the owner UI's GroupBuilder has a human-identifiable
// (player-name-joined) team list to assign into groups, since the existing
// player-facing GET .../teams route returns only player1Id/player2Id.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { tournamentId, categoryId } = await params;
  const category = await findOwnedCategory(
    authResult.context.clubId,
    tournamentId,
    categoryId,
  );
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const teams = await listTeamsForCategoryWithPlayers(categoryId);
  return NextResponse.json({ teams });
}

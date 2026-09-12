import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { listTeamsForCategoryWithPlayers } from "@/core/tournaments/services/tournamentTeams.service";

type RouteParams = {
  params: Promise<{ tournamentId: string; categoryId: string }>;
};

// Uses the display-name-enriched read (listTeamsForCategoryWithPlayers,
// originally added for the owner UI's GroupBuilder) rather than the bare
// listTeamsForCategory — the player-facing RegisteredTeamsList needs teams
// to be human-identifiable too, not raw player ids.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;

  const { categoryId } = await params;
  const teams = await listTeamsForCategoryWithPlayers(categoryId);
  return NextResponse.json({ teams });
}

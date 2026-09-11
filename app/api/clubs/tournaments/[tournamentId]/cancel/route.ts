import { NextResponse, type NextRequest } from "next/server";
import { cancelTournament } from "@/core/tournaments/services/tournaments.service";
import { requireOwnerClub } from "../../../_lib/require-owner";
import { findOwnedTournament } from "../../../_lib/find-owned-tournament";
import { requireClubOperational } from "../../../_lib/require-club-operational";

type RouteParams = { params: Promise<{ tournamentId: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const operationalResult = await requireClubOperational(
    authResult.context.clubId,
  );
  if (!operationalResult.ok) return operationalResult.response;

  const { tournamentId } = await params;
  const owned = await findOwnedTournament(
    authResult.context.clubId,
    tournamentId,
  );
  if (!owned) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  try {
    const tournament = await cancelTournament(
      authResult.context.clubId,
      tournamentId,
      authResult.context.userId,
    );
    return NextResponse.json({ tournament });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel tournament";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

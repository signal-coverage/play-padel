import { NextResponse, type NextRequest } from "next/server";
import { publishTournament } from "@/core/tournaments/services/tournaments.service";
import { requireAdminClub } from "../../_lib/require-admin-club";
import { findOwnedTournament } from "@/app/api/clubs/_lib/find-owned-tournament";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";

type RouteParams = {
  params: Promise<{ clubId: string; tournamentId: string }>;
};

// Admin-only mirror of POST /api/clubs/tournaments/[tournamentId]/publish.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { clubId, tournamentId } = await params;
  const authResult = await requireAdminClub(clubId);
  if (!authResult.ok) return authResult.response;

  const operationalResult = await requireClubOperational(
    authResult.context.clubId,
  );
  if (!operationalResult.ok) return operationalResult.response;

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
    const tournament = await publishTournament(
      authResult.context.clubId,
      tournamentId,
      authResult.context.userId,
    );
    return NextResponse.json({ tournament });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to publish tournament";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { updateTournament } from "@/core/tournaments/services/tournaments.service";
import { updateTournamentSchema } from "@/core/tournaments/schemas/tournament.schema";
import { requireAdminClub } from "../_lib/require-admin-club";
import { findOwnedTournament } from "@/app/api/clubs/_lib/find-owned-tournament";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";

type RouteParams = {
  params: Promise<{ clubId: string; tournamentId: string }>;
};

// Admin-only mirror of GET/PATCH /api/clubs/tournaments/[tournamentId] — see
// the sibling top-level route.ts's own comment for the general pattern.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { clubId, tournamentId } = await params;
  const authResult = await requireAdminClub(clubId);
  if (!authResult.ok) return authResult.response;

  const tournament = await findOwnedTournament(
    authResult.context.clubId,
    tournamentId,
  );
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ tournament });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  const body = await request.json().catch(() => null);
  const parsed = updateTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const tournament = await updateTournament(
      authResult.context.clubId,
      tournamentId,
      parsed.data,
      authResult.context.userId,
    );
    return NextResponse.json({ tournament });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update tournament";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

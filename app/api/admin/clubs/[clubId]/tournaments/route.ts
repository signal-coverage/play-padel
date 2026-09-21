import { NextResponse, type NextRequest } from "next/server";
import {
  createTournament,
  listTournamentsForOwner,
} from "@/core/tournaments/services/tournaments.service";
import { createTournamentSchema } from "@/core/tournaments/schemas/tournament.schema";
import { requireAdminClub } from "./_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";

type RouteParams = { params: Promise<{ clubId: string }> };

// Admin-only mirror of GET/POST /api/clubs/tournaments — lets an admin list
// and create tournaments for ANY club (troubleshooting), resolving `clubId`
// from the route param via requireAdminClub() instead of the caller's own
// club. Business logic (the service calls below) is byte-identical to the
// owner-only route.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { clubId } = await params;
  const authResult = await requireAdminClub(clubId);
  if (!authResult.ok) return authResult.response;

  const tournaments = await listTournamentsForOwner(authResult.context.clubId);
  return NextResponse.json({ tournaments });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { clubId } = await params;
  const authResult = await requireAdminClub(clubId);
  if (!authResult.ok) return authResult.response;

  // Same gate the owner-only POST applies (see that route's own comment) —
  // an admin creating a tournament for a non-operational club hits the same
  // business rule an owner would.
  const operationalResult = await requireClubOperational(
    authResult.context.clubId,
  );
  if (!operationalResult.ok) return operationalResult.response;

  const body = await request.json().catch(() => null);
  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const tournament = await createTournament(
      authResult.context.clubId,
      parsed.data,
      authResult.context.userId,
    );
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create tournament";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

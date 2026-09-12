import { NextResponse, type NextRequest } from "next/server";
import {
  createTournament,
  listTournamentsForOwner,
} from "@/core/tournaments/services/tournaments.service";
import { createTournamentSchema } from "@/core/tournaments/schemas/tournament.schema";
import { requireOwnerClub } from "../_lib/require-owner";
import { requireClubOperational } from "../_lib/require-club-operational";

export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const tournaments = await listTournamentsForOwner(authResult.context.clubId);
  return NextResponse.json({ tournaments });
}

export async function POST(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

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

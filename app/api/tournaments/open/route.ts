import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { listOpenTournamentsForPlayer } from "@/core/tournaments/services/tournaments.service";

// Global (cross-club) discovery — feeds both the future nav badge (slice 5)
// and the tournaments list view (slice 4). No club scoping: see
// listOpenTournamentsForPlayer's own "no home club" reasoning.
export async function GET() {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;

  const tournaments = await listOpenTournamentsForPlayer(authResult.userId);
  return NextResponse.json({ tournaments });
}

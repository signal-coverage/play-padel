import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { getTournamentDetailForPlayer } from "@/core/tournaments/services/tournaments.service";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

type RouteParams = { params: Promise<{ tournamentId: string }> };

export const GET = withErrorHandling(async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;

  const { tournamentId } = await params;
  const tournament = await getTournamentDetailForPlayer(
    tournamentId,
    authResult.userId,
  );
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ tournament });
});

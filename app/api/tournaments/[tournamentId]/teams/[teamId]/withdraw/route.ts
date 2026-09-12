import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { withdrawTeam } from "@/core/tournaments/services/tournamentTeams.service";

type RouteParams = {
  params: Promise<{ tournamentId: string; teamId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;

  const { teamId } = await params;

  try {
    const team = await withdrawTeam(teamId, authResult.userId);
    return NextResponse.json({ team });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to withdraw team";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { registerTeam } from "@/core/tournaments/services/tournamentTeams.service";
import { registerTeamSchema } from "@/core/tournaments/schemas/tournament.schema";

type RouteParams = {
  params: Promise<{ tournamentId: string; categoryId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;

  const { categoryId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = registerTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const team = await registerTeam(
      categoryId,
      authResult.userId,
      parsed.data.partnerId,
    );
    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to register team";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

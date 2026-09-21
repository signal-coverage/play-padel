import { NextResponse, type NextRequest } from "next/server";
import { enterMatchScore } from "@/core/tournaments/services/matches.service";
import { enterMatchScoreSchema } from "@/core/tournaments/schemas/tournament.schema";
import { requireAdminClub } from "../../../../../../_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";

type RouteParams = {
  params: Promise<{
    clubId: string;
    tournamentId: string;
    categoryId: string;
    matchId: string;
  }>;
};

// Admin-only mirror of POST .../matches/[matchId]/score.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { clubId, tournamentId, categoryId, matchId } = await params;
  const authResult = await requireAdminClub(clubId);
  if (!authResult.ok) return authResult.response;

  const operationalResult = await requireClubOperational(
    authResult.context.clubId,
  );
  if (!operationalResult.ok) return operationalResult.response;

  const category = await findOwnedCategory(
    authResult.context.clubId,
    tournamentId,
    categoryId,
  );
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = enterMatchScoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    await enterMatchScore(
      matchId,
      parsed.data.sets,
      authResult.context.clubId,
      authResult.context.userId,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to enter match score";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

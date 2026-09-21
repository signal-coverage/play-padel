import { NextResponse, type NextRequest } from "next/server";
import { listTeamsForCategoryWithPlayers } from "@/core/tournaments/services/tournamentTeams.service";
import { requireAdminClub } from "../../../../_lib/require-admin-club";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

type RouteParams = {
  params: Promise<{ clubId: string; tournamentId: string; categoryId: string }>;
};

// Admin-only, read-only mirror of GET .../categories/[categoryId]/teams.
export const GET = withErrorHandling(async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const { clubId, tournamentId, categoryId } = await params;
  const authResult = await requireAdminClub(clubId);
  if (!authResult.ok) return authResult.response;

  const category = await findOwnedCategory(
    authResult.context.clubId,
    tournamentId,
    categoryId,
  );
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const teams = await listTeamsForCategoryWithPlayers(categoryId);
  return NextResponse.json({ teams });
});

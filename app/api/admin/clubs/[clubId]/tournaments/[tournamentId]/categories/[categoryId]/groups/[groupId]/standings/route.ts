import { NextResponse, type NextRequest } from "next/server";
import { computeGroupStandings } from "@/core/tournaments/services/standings.service";
import { requireAdminClub } from "../../../../../../_lib/require-admin-club";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";

type RouteParams = {
  params: Promise<{
    clubId: string;
    tournamentId: string;
    categoryId: string;
    groupId: string;
  }>;
};

// Admin-only, read-only mirror of GET .../groups/[groupId]/standings — no
// requireClubOperational gate, same as the owner-only route.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { clubId, tournamentId, categoryId, groupId } = await params;
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

  try {
    const standings = await computeGroupStandings(groupId);
    return NextResponse.json({ standings });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to compute standings";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

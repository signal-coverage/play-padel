import { NextResponse, type NextRequest } from "next/server";
import { computeGroupStandings } from "@/core/tournaments/services/standings.service";
import { requireOwnerClub } from "../../../../../../../_lib/require-owner";
import { findOwnedCategory } from "../../../../../../../_lib/find-owned-category";

type RouteParams = {
  params: Promise<{
    tournamentId: string;
    categoryId: string;
    groupId: string;
  }>;
};

// Read-only — no requireClubOperational gate here (see that helper's own
// comment: never apply it to a GET route).
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { tournamentId, categoryId, groupId } = await params;
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

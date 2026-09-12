import { NextResponse, type NextRequest } from "next/server";
import { listMatchesForGroup } from "@/core/tournaments/services/matches.service";
import { requireOwnerClub } from "../../../../../../../_lib/require-owner";
import { findOwnedCategory } from "../../../../../../../_lib/find-owned-category";

type RouteParams = {
  params: Promise<{
    tournamentId: string;
    categoryId: string;
    groupId: string;
  }>;
};

// Read-only, owner-scoped. Not part of the plan's original explicit route
// list — added so the owner UI has somewhere to fetch "a plain list of a
// group's matches" from, per this slice's own UI requirement.
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

  const matches = await listMatchesForGroup(groupId);
  return NextResponse.json({ matches });
}

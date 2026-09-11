import { NextResponse, type NextRequest } from "next/server";
import { listKnockoutMatchesForCategory } from "@/core/tournaments/services/matches.service";
import { requireOwnerClub } from "../../../../../_lib/require-owner";
import { findOwnedCategory } from "../../../../../_lib/find-owned-category";

type RouteParams = {
  params: Promise<{ tournamentId: string; categoryId: string }>;
};

// Read-only — no requireClubOperational gate (see that helper's own comment:
// never apply it to a GET route). Powers the owner UI's KnockoutRoundsList.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { tournamentId, categoryId } = await params;
  const category = await findOwnedCategory(
    authResult.context.clubId,
    tournamentId,
    categoryId,
  );
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const matches = await listKnockoutMatchesForCategory(categoryId);
  return NextResponse.json({ matches });
}

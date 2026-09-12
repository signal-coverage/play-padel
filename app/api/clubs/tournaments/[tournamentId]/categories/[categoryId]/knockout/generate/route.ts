import { NextResponse, type NextRequest } from "next/server";
import { generateKnockoutBracket } from "@/core/tournaments/services/matches.service";
import { requireOwnerClub } from "../../../../../../_lib/require-owner";
import { requireClubOperational } from "../../../../../../_lib/require-club-operational";
import { findOwnedCategory } from "../../../../../../_lib/find-owned-category";

type RouteParams = {
  params: Promise<{ tournamentId: string; categoryId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const operationalResult = await requireClubOperational(
    authResult.context.clubId,
  );
  if (!operationalResult.ok) return operationalResult.response;

  const { tournamentId, categoryId } = await params;
  const category = await findOwnedCategory(
    authResult.context.clubId,
    tournamentId,
    categoryId,
  );
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  try {
    await generateKnockoutBracket(
      categoryId,
      authResult.context.clubId,
      authResult.context.userId,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to generate the knockout bracket";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

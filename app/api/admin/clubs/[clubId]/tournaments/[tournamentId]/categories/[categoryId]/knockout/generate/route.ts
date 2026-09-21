import { NextResponse, type NextRequest } from "next/server";
import { generateKnockoutBracket } from "@/core/tournaments/services/matches.service";
import { requireAdminClub } from "../../../../../_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";

type RouteParams = {
  params: Promise<{ clubId: string; tournamentId: string; categoryId: string }>;
};

// Admin-only mirror of POST .../categories/[categoryId]/knockout/generate.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { clubId, tournamentId, categoryId } = await params;
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

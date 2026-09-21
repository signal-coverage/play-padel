import { NextResponse, type NextRequest } from "next/server";
import { lockGroups } from "@/core/tournaments/services/groups.service";
import { requireAdminClub } from "../../../../../_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";

type RouteParams = {
  params: Promise<{ clubId: string; tournamentId: string; categoryId: string }>;
};

// Admin-only mirror of POST .../categories/[categoryId]/groups/lock.
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
    await lockGroups(categoryId, authResult.context.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to lock groups";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

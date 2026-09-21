import { NextResponse, type NextRequest } from "next/server";
import {
  setGroupsManually,
  generateGroupsAutomatically,
  listGroupsForCategory,
} from "@/core/tournaments/services/groups.service";
import { setGroupsSchema } from "@/core/tournaments/schemas/tournament.schema";
import { requireAdminClub } from "../../../../_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";

type RouteParams = {
  params: Promise<{ clubId: string; tournamentId: string; categoryId: string }>;
};

// Admin-only mirror of GET/POST .../categories/[categoryId]/groups — read-only
// GET has no requireClubOperational gate, same as the owner-only route.
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

  const groups = await listGroupsForCategory(categoryId);
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

  const body = await request.json().catch(() => null);
  const parsed = setGroupsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.mode === "manual") {
      await setGroupsManually(
        categoryId,
        parsed.data.groups,
        authResult.context.userId,
      );
    } else {
      await generateGroupsAutomatically(categoryId, authResult.context.userId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set groups";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

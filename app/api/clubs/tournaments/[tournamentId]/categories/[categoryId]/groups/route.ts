import { NextResponse, type NextRequest } from "next/server";
import {
  setGroupsManually,
  generateGroupsAutomatically,
  listGroupsForCategory,
} from "@/core/tournaments/services/groups.service";
import { setGroupsSchema } from "@/core/tournaments/schemas/tournament.schema";
import { requireOwnerClub } from "../../../../../_lib/require-owner";
import { requireClubOperational } from "../../../../../_lib/require-club-operational";
import { findOwnedCategory } from "../../../../../_lib/find-owned-category";

type RouteParams = {
  params: Promise<{ tournamentId: string; categoryId: string }>;
};

// Read-only — no requireClubOperational gate (see that helper's own comment:
// never apply it to a GET route). Not part of the plan's original explicit
// route list; added so the owner UI's GroupBuilder has somewhere to fetch a
// category's existing groups from.
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

  const groups = await listGroupsForCategory(categoryId);
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

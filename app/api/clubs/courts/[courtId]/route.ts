import { NextResponse, type NextRequest } from "next/server";
import {
  softDeleteCourt,
  updateCourt,
} from "@/core/courts/services/courts.service";
import { updateCourtSchema } from "@/core/courts/schemas/court.schema";
import { requireOwnerClub } from "../../_lib/require-owner";
import { findOwnedCourt } from "../../_lib/find-owned-court";

type RouteParams = { params: Promise<{ courtId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const court = await updateCourt(
      courtId,
      parsed.data,
      authResult.context.userId,
    );
    return NextResponse.json({ court });
  } catch {
    return NextResponse.json(
      { error: "Failed to update court" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  try {
    await softDeleteCourt(courtId, authResult.context.userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete court" },
      { status: 500 },
    );
  }
}

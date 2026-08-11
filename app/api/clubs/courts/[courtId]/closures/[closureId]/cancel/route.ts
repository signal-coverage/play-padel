import { NextResponse, type NextRequest } from "next/server";
import { cancelClosure } from "@/core/courts/services/courts.service";
import { requireOwnerClub } from "../../../../../_lib/require-owner";
import { findOwnedCourt } from "../../../../../_lib/find-owned-court";

type RouteParams = { params: Promise<{ courtId: string; closureId: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId, closureId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  try {
    const closure = await cancelClosure(
      authResult.context.clubId,
      courtId,
      closureId,
      authResult.context.userId,
    );
    return NextResponse.json({ closure });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel closure";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

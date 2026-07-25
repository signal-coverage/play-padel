import { NextResponse, type NextRequest } from "next/server";
import {
  getCourtAvailability,
  setCourtAvailability,
} from "@/core/courts/services/courts.service";
import { weeklyAvailabilityTemplateSchema } from "@/core/courts/schemas/court.schema";
import { requireOwnerClub } from "../../../_lib/require-owner";
import { findOwnedCourt } from "../../../_lib/find-owned-court";

type RouteParams = { params: Promise<{ courtId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const availability = await getCourtAvailability(courtId);
  return NextResponse.json({ availability });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = weeklyAvailabilityTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const availability = await setCourtAvailability(courtId, parsed.data);
    return NextResponse.json({ availability });
  } catch {
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 },
    );
  }
}

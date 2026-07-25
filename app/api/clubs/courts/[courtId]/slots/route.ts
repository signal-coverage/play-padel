import { NextResponse, type NextRequest } from "next/server";
import { getCourtSlots } from "@/core/courts/services/courts.service";
import { requireOwnerClub } from "../../../_lib/require-owner";
import { findOwnedCourt } from "../../../_lib/find-owned-court";
import { parseDateParam } from "../../../_lib/parse-date-param";

type RouteParams = { params: Promise<{ courtId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const date = parseDateParam(request.nextUrl.searchParams.get("date"));
  if (!date) {
    return NextResponse.json(
      { error: "Missing or invalid date query param (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  try {
    const slots = await getCourtSlots(courtId, date);
    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json(
      { error: "Failed to load court slots" },
      { status: 500 },
    );
  }
}

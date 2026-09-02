import { NextResponse, type NextRequest } from "next/server";
import { requireOwnerClub } from "../_lib/require-owner";
import {
  getClubOperatingHours,
  setClubOperatingHours,
} from "@/core/clubs/services/operatingHours.service";
import { clubOperatingHoursSchema } from "@/core/clubs/schemas/clubOperatingHours.schema";

// Reads the caller's own club's operating hours. Consumed by CourtFormSheet
// (to prefill a new court's default availability) and by the Club Settings
// "Operating Hours" tab (to let an owner edit them after onboarding).
export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const operatingHours = await getClubOperatingHours(authResult.context.clubId);
  return NextResponse.json({ operatingHours });
}

// Lets an owner edit their club's normal operating hours after onboarding —
// previously a write-once value with no update path. Mirrors the analogous
// per-court PUT in ../courts/[courtId]/availability/route.ts.
export async function PUT(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => null);
  const parsed = clubOperatingHoursSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const operatingHours = await setClubOperatingHours(
    authResult.context.clubId,
    parsed.data,
  );
  return NextResponse.json({ operatingHours });
}

import { NextResponse, type NextRequest } from "next/server";
import { listReservationsByClub } from "@/core/reservations/services/reservations.service";
import { RESERVATION_STATUS_LABELS } from "@/core/reservations/consts";
import type { ReservationStatus } from "@/core/reservations/types";
import { requireOwnerClub } from "../_lib/require-owner";
import { parseDateParam } from "../_lib/parse-date-param";

// listReservationsByClub defaults to only SCHEDULED/CONFIRMED when no status
// filter is passed, so the owner's day view (which should also surface
// cancelled/completed/no-show reservations for that day) explicitly asks for
// every known status.
const ALL_STATUSES = Object.keys(
  RESERVATION_STATUS_LABELS,
) as ReservationStatus[];

export async function GET(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const dateParam = request.nextUrl.searchParams.get("date");
  const courtId = request.nextUrl.searchParams.get("courtId") ?? undefined;

  let date: Date | undefined;
  if (dateParam) {
    const parsed = parseDateParam(dateParam);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid date query param (expected YYYY-MM-DD)" },
        { status: 400 },
      );
    }
    date = parsed;
  }

  try {
    const reservations = await listReservationsByClub(
      authResult.context.clubId,
      {
        ...(date && { date }),
        ...(courtId && { courtId }),
        status: ALL_STATUSES,
      },
    );
    return NextResponse.json({ reservations });
  } catch {
    return NextResponse.json(
      { error: "Failed to load reservations" },
      { status: 500 },
    );
  }
}

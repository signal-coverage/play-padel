import { NextResponse, type NextRequest } from "next/server";
import {
  listReservationsByClub,
  summarizeReservationsByDay,
} from "@/core/reservations/services/reservations.service";
import { RESERVATION_STATUS_LABELS } from "@/core/reservations/consts";
import type { ReservationStatus } from "@/core/reservations/types";
import { requireOwnerClub } from "../../_lib/require-owner";
import { parseDateParam } from "../../_lib/parse-date-param";

// listReservationsByClub defaults to only SCHEDULED/CONFIRMED when no status
// filter is passed, so the owner's range summary (which should also count
// cancelled/completed/no-show reservations per day) explicitly asks for
// every known status.
const ALL_STATUSES = Object.keys(
  RESERVATION_STATUS_LABELS,
) as ReservationStatus[];

export async function GET(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const dateFrom = parseDateParam(fromParam);
  if (!dateFrom) {
    return NextResponse.json(
      { error: "Invalid from query param (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const dateTo = parseDateParam(toParam);
  if (!dateTo) {
    return NextResponse.json(
      { error: "Invalid to query param (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  try {
    const reservations = await listReservationsByClub(
      authResult.context.clubId,
      {
        dateFrom,
        dateTo,
        status: ALL_STATUSES,
      },
    );
    const days = summarizeReservationsByDay(reservations, dateFrom, dateTo);
    return NextResponse.json({ days });
  } catch {
    return NextResponse.json(
      { error: "Failed to load reservation summary" },
      { status: 500 },
    );
  }
}

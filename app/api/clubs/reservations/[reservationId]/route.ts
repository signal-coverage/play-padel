import { NextResponse, type NextRequest } from "next/server";
import {
  cancelReservation,
  completeReservation,
  getReservation,
  noShowReservation,
} from "@/core/reservations/services/reservations.service";
import { requireOwnerClub } from "../../_lib/require-owner";

type RouteParams = { params: Promise<{ reservationId: string }> };
type ReservationAction = "cancel" | "complete" | "noShow";

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;
  const { clubId, userId } = authResult.context;

  const { reservationId } = await params;

  // getReservation(clubId, id) doubles as the ownership check: it returns
  // null (not just an authorization error) whenever the reservation doesn't
  // belong to the caller's club, so a 404 here can't be used to probe which
  // reservation ids exist at other clubs.
  const existing = await getReservation(clubId, reservationId);
  if (!existing) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as ReservationAction | undefined;

  try {
    switch (action) {
      case "cancel": {
        const reservation = await cancelReservation(reservationId, userId);
        return NextResponse.json({ reservation });
      }
      case "complete": {
        const reservation = await completeReservation(
          clubId,
          reservationId,
          userId,
        );
        return NextResponse.json({ reservation });
      }
      case "noShow": {
        const reservation = await noShowReservation(
          clubId,
          reservationId,
          userId,
        );
        return NextResponse.json({ reservation });
      }
      default:
        return NextResponse.json(
          { error: "Invalid action; expected cancel, complete, or noShow" },
          { status: 400 },
        );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 },
    );
  }
}

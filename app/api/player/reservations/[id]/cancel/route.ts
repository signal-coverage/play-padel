import { NextResponse } from "next/server";
import {
  listReservationsByUser,
  canSelfCancel,
  cancelReservation,
} from "@/core/reservations/services/reservations.service";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";

// Self-cancel, scoped to the caller's own reservations. core/reservations
// only exposes getReservation(clubId, id) (club-scoped, for the owner
// dashboard) — there's no club-agnostic lookup by id, and this route can't
// know the clubId up front. Rather than add one to core (read-only
// dependency for this agent), ownership + the reservation's own fields are
// read back via listReservationsByUser, which is already scoped to userId.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const { id } = await params;

  const mine = await listReservationsByUser(userId, { includePast: true });
  const reservation = mine.find((r) => r.id === id);

  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }
  if (!canSelfCancel(reservation)) {
    return NextResponse.json(
      {
        error:
          "This reservation can no longer be self-cancelled (inside the 2-hour cutoff). Contact the club directly.",
      },
      { status: 403 },
    );
  }

  // Reservations are non-refundable on this platform — cancelling here
  // never triggers a refund, even when the reservation was paid. See Terms
  // & Conditions section 4.
  const cancelled = await cancelReservation(id, userId);
  return NextResponse.json({ reservation: cancelled });
}

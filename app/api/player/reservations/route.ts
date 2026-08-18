import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listReservationsByUser,
  createReservation,
  cancelReservation,
  canSelfCancel,
} from "@/core/reservations/services/reservations.service";
import { getCourtById } from "@/core/courts/services/courts.service";
import { getClubById } from "@/core/clubs/services/clubs.service";
import {
  createInvoice,
  issueInvoice,
  getReservationIdsWithReceipt,
} from "@/core/billing/services/billing.service";
import { createCheckoutPreference } from "@/lib/mercadopago/preferences";

// Player's "my reservations" list, across all clubs. Each row also carries a
// server-computed canSelfCancel flag (docs/reservation-flow.md: self-cancel
// allowed until 2h before scheduledStart) so the client never has to
// reimplement that cutoff rule — it just reads the flag.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includePast =
    request.nextUrl.searchParams.get("includePast") === "true";
  const reservations = await listReservationsByUser(userId, { includePast });
  const receiptableIds = await getReservationIdsWithReceipt(
    reservations.map((r) => r.id),
  );
  const withFlag = reservations.map((reservation) => ({
    ...reservation,
    canSelfCancel: canSelfCancel(reservation),
    hasReceipt: receiptableIds.has(reservation.id),
  }));

  return NextResponse.json({ reservations: withFlag });
}

// Instant CONFIRMED booking (docs/reservation-flow.md), unless the court's
// club requires prepayment — in that case this creates a 15-minute SCHEDULED
// hold plus an ISSUED invoice, and returns a Mercado Pago checkoutUrl instead
// of an immediately-confirmed reservation. createReservation already runs
// both the court-level and user-level (all-clubs) overlap conflict checks
// internally, so this route does not duplicate that logic — it only forwards
// the caller's own Clerk userId rather than trusting one from the request body.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const courtId = body?.courtId;
  const scheduledStart = body?.scheduledStart;
  const scheduledEnd = body?.scheduledEnd;
  const notes = typeof body?.notes === "string" ? body.notes : undefined;

  if (
    typeof courtId !== "string" ||
    typeof scheduledStart !== "string" ||
    typeof scheduledEnd !== "string"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const court = await getCourtById(courtId);
  if (!court) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const club = await getClubById(court.clubId);
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  // Every court's reservation fee decides whether payment is required — not
  // the club's `requiresPrepayment` toggle. A court with a reservation fee of
  // exactly 0 is deliberately free and books instantly; any other court must
  // be paid online before the reservation is confirmed. Only `undefined`/
  // `null` means "no reservation fee configured" and blocks booking below;
  // `!court.reservationFee` would incorrectly treat 0 the same as "not set".
  if (court.reservationFee === 0) {
    try {
      const reservation = await createReservation(userId, {
        userId,
        courtId,
        scheduledStart,
        scheduledEnd,
        notes,
      });
      return NextResponse.json({ reservation }, { status: 201 });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create reservation";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  }

  if (typeof court.reservationFee !== "number") {
    return NextResponse.json(
      {
        error: "This court doesn't have a price set yet — contact the club",
      },
      { status: 422 },
    );
  }

  let reservation: Awaited<ReturnType<typeof createReservation>> | undefined;
  try {
    reservation = await createReservation(
      userId,
      { userId, courtId, scheduledStart, scheduledEnd, notes },
      { pendingPayment: true },
    );

    const invoice = await createInvoice(court.clubId, userId, {
      userId,
      reservationId: reservation.id,
      currency: club.currency,
      items: [
        {
          description: `${court.name} reservation`,
          quantity: 1,
          unitPrice: court.reservationFee,
          total: court.reservationFee,
        },
      ],
      tax: 0,
      discount: 0,
    });
    await issueInvoice(court.clubId, invoice.id, userId);

    const { checkoutUrl } = await createCheckoutPreference({
      reservationId: reservation.id,
      courtName: court.name,
      price: court.reservationFee,
      currency: club.currency,
    });

    return NextResponse.json({ reservation, checkoutUrl }, { status: 201 });
  } catch (err) {
    // If the reservation hold was created before a later step (invoice,
    // issue, or checkout preference) threw, roll it back so no orphaned
    // SCHEDULED reservation is left behind waiting on a payment the player
    // was never given a way to complete. A rollback failure here must not
    // mask the original error — it's swallowed and the original error
    // response is returned regardless.
    if (reservation) {
      try {
        await cancelReservation(reservation.id, userId);
      } catch {
        // Best-effort rollback; original error below still applies.
      }
    }

    const message =
      err instanceof Error ? err.message : "Could not create reservation";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

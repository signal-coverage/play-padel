import { NextResponse, type NextRequest } from "next/server";
import {
  cancelReservation,
  completeReservation,
  confirmReservationPayment,
  getReservation,
  noShowReservation,
  checkCourtClosureConflict,
  checkCourtConflict,
} from "@/core/reservations/services/reservations.service";
import {
  getInvoiceByReservationId,
  recordPayment,
} from "@/core/billing/services/billing.service";
import { getClubOwner } from "@/core/clubs/services/clubs.service";
import { dispatch } from "@/lib/notifications/dispatcher";
import { requireOwnerClub } from "../../_lib/require-owner";

type RouteParams = { params: Promise<{ reservationId: string }> };
type ReservationAction = "cancel" | "complete" | "noShow" | "confirmTransfer";

// Best-effort — mirrors the Mercado Pago webhook's own owner notification for
// this exact scenario (see app/api/webhooks/mercadopago/route.ts). A failure
// here must never mask the caller's own response.
async function notifyOwnerOfPaymentConflict(
  clubId: string,
  reservationId: string,
): Promise<void> {
  try {
    const owner = await getClubOwner(clubId);
    if (owner) {
      await dispatch({
        type: "RESERVATION_PAYMENT_CONFLICT",
        clubId,
        recipientId: owner.id,
        recipientEmail: owner.email,
        recipientName: owner.displayName,
        subject: "A paid reservation could not be confirmed",
        html: "A player's payment was received, but their slot could not be confirmed automatically. Please resolve this manually.",
        sendEmail: false,
      });
    }
  } catch (notifyErr) {
    console.error(
      `[confirmTransfer] Failed to notify owner of a payment conflict for reservation ${reservationId}:`,
      notifyErr,
    );
  }
}

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
        // Reservations are non-refundable on this platform — cancelling
        // here never triggers a refund, even when the reservation was
        // paid. See Terms & Conditions section 4.
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
      case "confirmTransfer": {
        // Only ever reached for a pending, unexpired bank-transfer hold —
        // any other state means either there's nothing to confirm, or the
        // hold already lapsed and (per docs: bank-transfer-payment-method
        // design's race scenario) the slot may have been re-booked by
        // someone else in the meantime. The paymentExpiresAt check IS the
        // full guard against that race: while a SCHEDULED hold hasn't
        // lapsed, checkCourtConflict already refuses any conflicting
        // booking for the same slot (see reservations.service.ts), so a
        // still-unexpired hold can never have been silently double-booked
        // out from under it.
        if (
          existing.status !== "SCHEDULED" ||
          existing.paymentMethod !== "TRANSFER"
        ) {
          return NextResponse.json(
            {
              error: "This reservation has no pending bank transfer to confirm",
            },
            { status: 409 },
          );
        }
        if (
          !existing.paymentExpiresAt ||
          existing.paymentExpiresAt.getTime() < Date.now()
        ) {
          return NextResponse.json(
            {
              error:
                "This hold expired and the slot may no longer be available — ask the player to rebook.",
            },
            { status: 409 },
          );
        }
        const invoice = await getInvoiceByReservationId(reservationId);
        if (!invoice) {
          return NextResponse.json(
            { error: "No invoice found for this reservation" },
            { status: 409 },
          );
        }
        // Guard against a double-confirm (e.g. two owner clicks, or a
        // near-simultaneous webhook) surfacing as an opaque 500 from
        // recordPayment's own ISSUED-only guard — check the invoice's status
        // up front and return a clear, specific 409 instead.
        if (invoice.status !== "ISSUED") {
          return NextResponse.json(
            { error: "This payment was already confirmed" },
            { status: 409 },
          );
        }
        await recordPayment(clubId, userId, {
          invoiceId: invoice.id,
          method: "TRANSFER",
          amount: invoice.total,
          currency: invoice.currency,
        });

        // The payment is now permanently captured/recorded — everything
        // below this point must never leave that fact silently unreflected.
        // Re-check the slot right before confirming, same as the Mercado
        // Pago webhook already does (app/api/webhooks/mercadopago/route.ts):
        // the hold's own paymentExpiresAt guard above only protects against
        // it lapsing before this point, not against the court closing or
        // another booking landing in the (however brief) window between
        // that check and this one.
        const closureReason = await checkCourtClosureConflict({
          courtId: existing.courtId,
          scheduledStart: existing.scheduledStart,
          scheduledEnd: existing.scheduledEnd,
        });
        const overlapsAnotherReservation = closureReason
          ? false
          : await checkCourtConflict({
              clubId,
              courtId: existing.courtId,
              scheduledStart: existing.scheduledStart,
              scheduledEnd: existing.scheduledEnd,
              excludeId: reservationId,
            });

        if (closureReason || overlapsAnotherReservation) {
          console.error(
            `[confirmTransfer] Payment recorded for reservation ${reservationId} but its ${
              closureReason
                ? `court is now closed ("${closureReason}")`
                : "slot now overlaps another reservation"
            } — needs manual resolution via the owner Reservations page.`,
          );
          await notifyOwnerOfPaymentConflict(clubId, reservationId);
          return NextResponse.json({
            reservation: existing,
            warning:
              "Payment recorded, but this slot is no longer available. Please resolve manually.",
          });
        }

        // Recorded under the real owner's userId (not the Mercado Pago
        // webhook's default attribution) — this confirmation was a manual
        // owner action, and the audit trail must reflect that.
        let reservation;
        try {
          reservation = await confirmReservationPayment(reservationId, userId);
        } catch (err) {
          // A failure here (e.g. a genuine race losing to the exclusion
          // constraint despite the re-check above) must never fall through
          // to the generic 500 below — that response is indistinguishable
          // from "nothing happened", but the payment was already
          // permanently committed by recordPayment above.
          console.error(
            `[confirmTransfer] Payment recorded for reservation ${reservationId} but confirming it failed — needs manual resolution via the owner Reservations page.`,
            err,
          );
          await notifyOwnerOfPaymentConflict(clubId, reservationId);
          return NextResponse.json({
            reservation: existing,
            warning:
              "Payment recorded, but confirming the reservation failed. Please resolve manually.",
          });
        }
        return NextResponse.json({ reservation });
      }
      default:
        return NextResponse.json(
          {
            error:
              "Invalid action; expected cancel, complete, noShow, or confirmTransfer",
          },
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

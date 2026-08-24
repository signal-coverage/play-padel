import { NextRequest, NextResponse } from "next/server";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago/webhookSignature";
import { getMercadoPagoPayment } from "@/lib/mercadopago/payments";
import {
  findReservationById,
  confirmReservationPayment,
  checkCourtClosureConflict,
} from "@/core/reservations/services/reservations.service";
import {
  getInvoiceByReservationId,
  recordPayment,
} from "@/core/billing/services/billing.service";

const SYSTEM_ACTOR = "system:mercadopago-webhook";

// Mercado Pago's source-of-truth payment notification. The webhook body
// itself is never trusted for payment status — only used to know which
// payment id to re-fetch via an authenticated GET (see
// lib/mercadopago/payments.ts). Always acks with 2xx once the signature is
// valid, even on a business-logic no-op (e.g. an already-processed payment
// from a duplicate delivery) — Mercado Pago retries on any non-2xx response.
//
// Club resolution happens BEFORE the payment is ever fetched: a seller-OAuth
// payment generally can't be read with a different account's token, so we
// must know which club's client to use first. `reservationId` is embedded
// as a query param on notification_url at preference-creation time (see
// lib/mercadopago/preferences.ts) specifically so it's available here
// without ever having read the payment itself. Once the payment is fetched
// with the resolved club's client, its `external_reference` is cross-checked
// against `reservationId` — a mismatch is rejected outright rather than
// trusted.
export async function POST(request: NextRequest) {
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const dataId = request.nextUrl.searchParams.get("data.id");
  const reservationId = request.nextUrl.searchParams.get("reservationId");

  const validSignature = verifyMercadoPagoSignature({
    xSignature,
    xRequestId,
    dataId,
  });
  if (!validSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!dataId) {
    return NextResponse.json({ error: "Missing data.id" }, { status: 400 });
  }

  if (!reservationId) {
    // Without reservationId we cannot resolve which club's token to use to
    // re-fetch the payment — not a notification we can act on. Ack and
    // ignore rather than error, matching the "not a payment we created a
    // preference for" no-op below.
    return NextResponse.json({ ok: true });
  }

  const reservation = await findReservationById(reservationId);
  if (!reservation) {
    return NextResponse.json({ ok: true });
  }

  let mpPayment;
  try {
    mpPayment = await getMercadoPagoPayment(dataId, reservation.clubId);
  } catch (err) {
    console.error(
      `[mercadopago webhook] Failed to fetch payment ${dataId} using club ${reservation.clubId}'s Mercado Pago client:`,
      err,
    );
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 },
    );
  }

  if (mpPayment.externalReference !== reservationId) {
    console.error(
      `[mercadopago webhook] external_reference mismatch: expected reservationId ${reservationId}, got ${mpPayment.externalReference} for payment ${dataId}`,
    );
    return NextResponse.json(
      { error: "external_reference mismatch" },
      { status: 400 },
    );
  }

  const invoice = await getInvoiceByReservationId(reservation.id);
  if (!invoice) {
    return NextResponse.json({ ok: true });
  }

  if (mpPayment.status === "approved") {
    try {
      await recordPayment(reservation.clubId, SYSTEM_ACTOR, {
        invoiceId: invoice.id,
        method: "DIGITAL",
        amount: invoice.total,
        currency: invoice.currency,
        reference: String(mpPayment.id),
      });

      const closureReason = await checkCourtClosureConflict({
        courtId: reservation.courtId,
        scheduledStart: reservation.scheduledStart,
        scheduledEnd: reservation.scheduledEnd,
      });

      if (closureReason) {
        // The payment was genuinely captured by Mercado Pago, so it must
        // still be recorded (above) — but the court has since been closed,
        // so the reservation is left SCHEDULED (unconfirmed) rather than
        // silently confirmed into a slot that's no longer available. It
        // stays visible/actionable to the owner via the Reservations table
        // (which lists SCHEDULED + CONFIRMED by default), who can resolve it
        // manually via the existing owner-cancel-with-refund flow.
        console.error(
          `[mercadopago webhook] Payment recorded for reservation ${reservation.id} but its court is now closed ("${closureReason}") — needs manual refund/reschedule via the owner Reservations page.`,
        );
      } else {
        await confirmReservationPayment(reservation.id);
      }
    } catch (err) {
      // A duplicate webhook delivery for a payment we already recorded
      // re-fetches the invoice as PAID and recordPayment's own ISSUED-only
      // guard throws — that specific case is expected and safe to ack.
      // Anything else here is a genuine failure (DB error, etc.) and must
      // not be silently swallowed, so Mercado Pago retries the delivery.
      const freshInvoice = await getInvoiceByReservationId(reservation.id);
      const alreadyProcessed = freshInvoice?.status === "PAID";
      if (!alreadyProcessed) {
        console.error(
          "[mercadopago webhook] Failed to process approved payment:",
          err,
        );
        return NextResponse.json(
          { error: "Failed to process payment" },
          { status: 500 },
        );
      }
    }
  }
  // Every other status ("pending", "in_process", "authorized", "rejected",
  // "cancelled", etc.) is a no-op here. Non-approved statuses never touch the
  // invoice: this feature has no reservation-hold cleanup cron by explicit
  // design (see docs/DATABASE.md, "Notes on ReservationStatus") — an unpaid
  // SCHEDULED reservation is meant to simply linger until its 15-minute hold
  // lapses. Leaving the invoice ISSUED (rather than voiding it on a
  // "rejected"/"cancelled" delivery) is what lets a later retry on the same
  // preference succeed: Checkout Pro allows the buyer to retry with a
  // different card, and that retry's "approved" webhook must still find the
  // invoice ISSUED for recordPayment to accept it.

  return NextResponse.json({ ok: true });
}

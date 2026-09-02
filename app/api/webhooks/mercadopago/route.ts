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
import {
  MEMBERSHIP_WEBHOOK_TOPIC,
  MEMBERSHIP_PAYMENT_WEBHOOK_TOPIC,
} from "@/lib/mercadopago/membershipWebhookTopics";
import {
  handleSubscriptionPreapprovalTopic,
  handleMembershipPaymentTopic,
} from "@/lib/mercadopago/membershipWebhookHandlers";

const SYSTEM_ACTOR = "system:mercadopago-webhook";

// THE single Mercado Pago webhook entry point for this app. Mercado Pago's
// DevPanel registers exactly ONE notification URL per environment
// (test/production) — not one per subscribed topic — confirmed against the
// real DevPanel. Every topic this app subscribes to ("payment" and
// "subscription_preapproval") is delivered HERE, and dispatch happens
// internally based on the notification's `type`. A previously separate
// `app/api/webhooks/mercadopago/membership/route.ts` was unreachable in any
// real deployment because Mercado Pago never calls a second URL — it was
// removed and its logic now lives in
// `lib/mercadopago/membershipWebhookHandlers.ts`, imported below.
//
// `type`/`data.id`/`id` can arrive either in the JSON body (the confirmed
// modern webhook payload shape) or as query params appended by Mercado Pago
// to whatever `notification_url` a preference/preapproval embedded — both
// shapes are read, preferring the body when present.
//
// Reservation-payment notifications (this route's original, still-primary
// responsibility) carry NO `type` disambiguation of their own beyond
// `"payment"` and are resolved via the `reservationId` query param embedded
// on `notification_url` at preference-creation time (see
// lib/mercadopago/preferences.ts). ANNUAL membership payments also use the
// `"payment"` type but resolve via a `clubId` query param instead (see
// lib/mercadopago/platformPreferences.ts) — `reservationId` presence is what
// disambiguates between the two "payment"-type flows below.
export async function POST(request: NextRequest) {
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  const rawBody = await request.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = null;
  }
  const bodyData = body?.data as { id?: unknown } | undefined;
  const type =
    (typeof body?.type === "string" ? body.type : null) ??
    request.nextUrl.searchParams.get("type");
  const dataId =
    (typeof bodyData?.id === "string" ? bodyData.id : null) ??
    request.nextUrl.searchParams.get("data.id");
  const notificationId =
    (typeof body?.id === "string" ? body.id : null) ??
    request.nextUrl.searchParams.get("id");
  const reservationId = request.nextUrl.searchParams.get("reservationId");

  const validSignature = verifyMercadoPagoSignature({
    xSignature,
    xRequestId,
    dataId,
  });
  if (!validSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (type === MEMBERSHIP_WEBHOOK_TOPIC) {
    return handleSubscriptionPreapprovalTopic(dataId, notificationId);
  }

  if (type === MEMBERSHIP_PAYMENT_WEBHOOK_TOPIC && !reservationId) {
    return handleMembershipPaymentTopic(request, dataId, notificationId);
  }

  return handleReservationPaymentTopic(dataId, reservationId);
}

// Original reservation-payment logic, unchanged in behavior — only extracted
// into its own function so `POST` can stay a thin dispatcher. The webhook
// body itself is never trusted for payment status — only used to know which
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
async function handleReservationPaymentTopic(
  dataId: string | null,
  reservationId: string | null,
): Promise<NextResponse> {
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

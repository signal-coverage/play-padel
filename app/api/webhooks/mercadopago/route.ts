import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment as MpPaymentClient,
  WebhookSignatureValidator,
} from "mercadopago";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { PaymentStatus, ReservationStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Maps a Mercado Pago payment `status` value to our local {@link
 * PaymentStatus}. Returns `null` for non-terminal states (`pending`,
 * `in_process`, `authorized`) — those notifications are acknowledged but
 * cause no state change (spec: reservation stays PENDING_PAYMENT until
 * either a terminal webhook arrives or the 30-minute lazy-expiry window
 * elapses).
 */
function mapMpStatus(mpStatus: string | undefined): PaymentStatus | null {
  switch (mpStatus) {
    case "approved":
      return PaymentStatus.APPROVED;
    case "rejected":
      return PaymentStatus.REJECTED;
    case "cancelled":
      return PaymentStatus.CANCELLED;
    default:
      return null;
  }
}

/**
 * Mercado Pago deposit webhook (spec: "Payment Confirmation" / "Payment
 * Failure or Expiry"). Structure mirrors `app/api/webhooks/clerk/route.ts`:
 * verify signature first, then idempotently sync local state.
 *
 * NOT independently verifiable against a live Mercado Pago account in this
 * environment — MERCADOPAGO_ACCESS_TOKEN / MERCADOPAGO_WEBHOOK_SECRET are
 * unset (see .env.example). Both missing-config branches below fail loudly
 * with a 503 rather than silently accepting an unverified/fabricated
 * notification.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!webhookSecret || !accessToken) {
    console.error(
      "Mercado Pago webhook received but MERCADOPAGO_WEBHOOK_SECRET/MERCADOPAGO_ACCESS_TOKEN are not configured in this environment — cannot verify or process it."
    );
    return new NextResponse(
      "Mercado Pago is not configured in this environment",
      { status: 503 }
    );
  }

  const dataId = request.nextUrl.searchParams.get("data.id");
  const type = request.nextUrl.searchParams.get("type");

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: webhookSecret,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.error("Mercado Pago webhook signature verification failed", {
        reason: error.reason,
        requestId: error.requestId,
      });
      return new NextResponse("Webhook verification failed", { status: 400 });
    }
    throw error;
  }

  // Only `payment` notifications carry a payment status transition; other
  // event types (merchant_order, etc.) are acknowledged as a no-op.
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  const mpConfig = new MercadoPagoConfig({ accessToken });
  const mpPayment = await new MpPaymentClient(mpConfig).get({ id: dataId });

  const reservationId = mpPayment.external_reference;
  if (!reservationId) {
    console.error(
      "Mercado Pago payment has no external_reference — cannot correlate to a reservation",
      { mpPaymentId: dataId }
    );
    return NextResponse.json({ received: true });
  }

  // Idempotent lookup: a previously-processed delivery for this exact MP
  // payment id already carries it on our row; a first delivery is
  // correlated via the reservation's still-unlinked PENDING payment.
  const localPayment =
    (await prisma.payment.findUnique({ where: { mpPaymentId: dataId } })) ??
    (await prisma.payment.findFirst({
      where: { reservationId, mpPaymentId: null },
      orderBy: { createdAt: "desc" },
    }));

  if (!localPayment) {
    console.error(
      "Mercado Pago webhook could not be correlated to a local Payment row",
      { mpPaymentId: dataId, reservationId }
    );
    return NextResponse.json({ received: true });
  }

  // Already-terminal: duplicate delivery (spec: "Duplicate webhook delivery
  // is idempotent") — no-op.
  if (localPayment.status !== PaymentStatus.PENDING) {
    return NextResponse.json({ received: true });
  }

  const newStatus = mapMpStatus(mpPayment.status);
  if (!newStatus) {
    return NextResponse.json({ received: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: localPayment.id },
      data: {
        status: newStatus,
        mpPaymentId: dataId,
        webhookReceivedAt: new Date(),
      },
    });

    await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status:
          newStatus === PaymentStatus.APPROVED
            ? ReservationStatus.CONFIRMED
            : ReservationStatus.CANCELLED,
      },
    });
  });

  return NextResponse.json({ received: true });
}

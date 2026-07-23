import "server-only";

import { MercadoPagoConfig, Preference } from "mercadopago";

import type { Club, Payment, Reservation } from "./generated/prisma/client";

/**
 * Thrown when Mercado Pago credentials are not configured in this
 * environment. Mirrors how a missing `DATABASE_URL` fails loudly rather than
 * silently — this project's Mercado Pago account is NOT authenticated here
 * (see `.env.example`), so any code path that reaches a live API call is
 * expected to hit this and stop, not fabricate a fake success.
 */
export class PaymentProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "MERCADOPAGO_ACCESS_TOKEN is not configured — Mercado Pago checkout cannot be initiated in this environment."
    );
    this.name = "PaymentProviderNotConfiguredError";
  }
}

function getConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new PaymentProviderNotConfiguredError();
  }

  return new MercadoPagoConfig({ accessToken });
}

export type CreatePreferenceResult = {
  preferenceId: string;
  initPoint: string;
};

/**
 * Creates a Mercado Pago Checkout Pro preference for a reservation's deposit
 * (spec: "Deposit Payment Initiation"). Returns the `init_point` URL the
 * caller should redirect the user to.
 *
 * @param baseUrl Origin (scheme + host) of the running app, used to build
 *   the webhook `notification_url` and post-checkout `back_urls`. Computed
 *   by the caller (Server Action) from the incoming request's `headers()`
 *   rather than a hardcoded env var, since this app has no fixed deployment
 *   URL configured yet.
 * @throws {PaymentProviderNotConfiguredError} when Mercado Pago credentials
 *   are absent — this is the expected/blocked state in this environment.
 */
export async function createPreference({
  reservation,
  payment,
  club,
  baseUrl,
}: {
  reservation: Reservation;
  payment: Payment;
  club: Club;
  baseUrl: string;
}): Promise<CreatePreferenceResult> {
  const config = getConfig();
  const preferenceClient = new Preference(config);

  if (club.depositAmountArs == null) {
    throw new Error(
      `Club ${club.id} has depositRequired=true but no depositAmountArs configured`
    );
  }

  const response = await preferenceClient.create({
    body: {
      items: [
        {
          id: reservation.id,
          title: `Seña reserva de cancha — ${club.name}`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: club.depositAmountArs,
        },
      ],
      external_reference: reservation.id,
      metadata: { reservationId: reservation.id, paymentId: payment.id },
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${baseUrl}/reservations`,
        pending: `${baseUrl}/reservations`,
        failure: `${baseUrl}/reservations`,
      },
      auto_return: "approved",
    },
  });

  if (!response.id || !response.init_point) {
    throw new Error(
      "Mercado Pago preference creation returned no id/init_point"
    );
  }

  return { preferenceId: response.id, initPoint: response.init_point };
}

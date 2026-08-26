import { Preference, Payment } from "mercadopago";
import type { Plan } from "@/core/clubs/types";
import { getPlatformMercadoPagoClient } from "./platformClient";

function requireAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return appUrl;
}

export interface CreateMembershipPreferenceParams {
  clubId: string;
  plan: Plan;
  price: number;
  currency: string;
}

export interface MembershipPreferenceResult {
  checkoutUrl: string;
  preferenceId: string;
}

/**
 * Creates a one-time Checkout Pro preference for a club's ANNUAL membership
 * payment. Deliberately a NEW, platform-scoped module — never
 * `./preferences.ts`, which is club-OAuth-scoped for reservation payments (a
 * different money flow, see design.md's "Annual one-time payment" decision).
 * Uses the platform client (`platformClient.ts`), not a club's token.
 * Currency is threaded explicitly (spec's "Currency Threaded as Explicit
 * Parameter"). No `auto_recurring` object is ever set — annual billing must
 * never be a recurring MP object (spec's "Annual Billing Uses One-Time
 * Payment").
 */
export async function createMembershipPreference(
  params: CreateMembershipPreferenceParams,
): Promise<MembershipPreferenceResult> {
  const appUrl = requireAppUrl();
  const client = getPlatformMercadoPagoClient();
  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [
        {
          id: `membership-${params.plan}-annual`,
          title: `Club membership — ${params.plan} (annual)`,
          quantity: 1,
          unit_price: params.price,
          currency_id: params.currency,
        },
      ],
      external_reference: params.clubId,
      // Points at the base reservation webhook route, NOT a dedicated
      // membership route — Mercado Pago's DevPanel registers exactly ONE
      // notification URL per environment (confirmed against the real
      // DevPanel), so that's the only URL guaranteed to ever be called
      // regardless of what this field says. `app/api/webhooks/mercadopago/
      // route.ts` dispatches internally on `type` + `clubId` to
      // `handleMembershipPaymentTopic` (see
      // lib/mercadopago/membershipWebhookHandlers.ts).
      notification_url: `${appUrl}/api/webhooks/mercadopago?clubId=${params.clubId}`,
      auto_return: "approved",
    },
  });

  if (!result.init_point || !result.id) {
    throw new Error("Mercado Pago did not return a checkout URL");
  }

  return { checkoutUrl: result.init_point, preferenceId: result.id };
}

export interface MembershipPaymentStatus {
  id: number;
  status: string; // "approved" | "pending" | "rejected" | "cancelled" | ...
  externalReference: string | null;
}

/**
 * Re-fetches an ANNUAL membership's one-time Checkout Pro payment directly
 * from Mercado Pago, authenticated with the PLATFORM's own token — never a
 * club's OAuth token, since this money flow belongs to the platform (see
 * design.md's "MP client for membership" decision). Deliberately distinct
 * from `lib/mercadopago/payments.ts`'s `getMercadoPagoPayment`, which is
 * club-OAuth-scoped and therefore wrong for this flow. Consumed by the
 * membership webhook route's `payment`-type branch, whose `notification_url`
 * (see `createMembershipPreference` above) already embeds `?clubId=` so the
 * caller can resolve which club this payment belongs to BEFORE re-fetching
 * it — the webhook body itself is never trusted for payment status, matching
 * this repo's established Mercado Pago webhook pattern.
 */
export async function getMembershipPayment(
  paymentId: string,
): Promise<MembershipPaymentStatus> {
  const client = getPlatformMercadoPagoClient();
  const payment = new Payment(client);
  const result = await payment.get({ id: paymentId });
  return {
    id: result.id!,
    status: result.status ?? "unknown",
    externalReference: result.external_reference ?? null,
  };
}

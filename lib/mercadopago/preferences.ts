import { Preference } from "mercadopago";
import { requireAppUrl } from "@/lib/env";
import { getClubMercadoPagoClient } from "./clubMercadoPagoClient";

// Card-network issuers commonly cap a statement descriptor at 22 characters
// — truncate the club's own name (not the fixed "-PLAYPADEL" suffix) so the
// brand stays legible on a real bank/card statement instead of being cut
// off mid-word at some arbitrary point.
const STATEMENT_DESCRIPTOR_SUFFIX = "-PLAYPADEL";
const STATEMENT_DESCRIPTOR_MAX_LENGTH = 22;

function buildStatementDescriptor(clubName: string): string {
  const maxNameLength =
    STATEMENT_DESCRIPTOR_MAX_LENGTH - STATEMENT_DESCRIPTOR_SUFFIX.length;
  const truncatedName = clubName
    .toUpperCase()
    .slice(0, maxNameLength)
    .trimEnd();
  return `${truncatedName}${STATEMENT_DESCRIPTOR_SUFFIX}`;
}

// Creates a Checkout Pro preference for one reservation and returns the
// hosted redirect URL. Uses the OWNING CLUB's Mercado Pago client (see
// clubMercadoPagoClient.ts) so the resulting payment belongs to that club's
// own MP account — 100% of the amount goes to the club, no marketplace_fee
// is set. `marketplaceFee` is accepted (but intentionally unused) purely so
// a future commission feature doesn't require reshaping this signature; see
// design.md's "no marketplace_fee" decision.
//
// external_reference carries the reservationId so the webhook (which only
// receives a Mercado Pago payment id) can look up which reservation/invoice
// a confirmed payment belongs to. reservationId is ALSO embedded as a query
// param on notification_url so the webhook can resolve which club's token to
// re-fetch the payment with BEFORE it has read anything about the payment
// itself (see app/api/webhooks/mercadopago/route.ts).
export async function createCheckoutPreference(params: {
  clubId: string;
  clubName: string;
  reservationId: string;
  courtName: string;
  price: number;
  currency: string;
  marketplaceFee?: number;
}): Promise<{ checkoutUrl: string }> {
  const appUrl = requireAppUrl();
  const returnUrl = `${appUrl}/dashboard/browse/payment-return?reservationId=${params.reservationId}`;

  const client = await getClubMercadoPagoClient(params.clubId);
  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [
        {
          id: params.reservationId,
          // Human-readable purchase description — this, not
          // external_reference below, is what a player actually recognizes
          // when reviewing the payment's own detail screen later. Never
          // rename external_reference itself: the webhook cross-checks it
          // verbatim against the reservationId to resolve which booking a
          // confirmed payment belongs to (see app/api/webhooks/mercadopago).
          title: `${params.courtName} — ${params.clubName} · Play Padel`,
          quantity: 1,
          unit_price: params.price,
          currency_id: params.currency,
        },
      ],
      statement_descriptor: buildStatementDescriptor(params.clubName),
      external_reference: params.reservationId,
      notification_url: `${appUrl}/api/webhooks/mercadopago?reservationId=${params.reservationId}`,
      back_urls: {
        success: returnUrl,
        pending: returnUrl,
        failure: returnUrl,
      },
      auto_return: "approved",
    },
  });

  if (!result.init_point) {
    throw new Error("Mercado Pago did not return a checkout URL");
  }

  return { checkoutUrl: result.init_point };
}

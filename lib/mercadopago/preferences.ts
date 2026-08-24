import { Preference } from "mercadopago";
import { getClubMercadoPagoClient } from "./clubMercadoPagoClient";

function requireAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return appUrl;
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
          title: `Court reservation — ${params.courtName}`,
          quantity: 1,
          unit_price: params.price,
          currency_id: params.currency,
        },
      ],
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

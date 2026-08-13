import { Preference } from "mercadopago";
import { getMercadoPagoClient } from "./client";

function requireAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return appUrl;
}

// Creates a Checkout Pro preference for one reservation and returns the
// hosted redirect URL. external_reference carries the reservationId so the
// webhook (which only receives a Mercado Pago payment id) can look up which
// reservation/invoice a confirmed payment belongs to.
export async function createCheckoutPreference(params: {
  reservationId: string;
  courtName: string;
  price: number;
  currency: string;
}): Promise<{ checkoutUrl: string }> {
  const appUrl = requireAppUrl();
  const returnUrl = `${appUrl}/dashboard/browse/payment-return?reservationId=${params.reservationId}`;

  const preference = new Preference(getMercadoPagoClient());
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
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
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

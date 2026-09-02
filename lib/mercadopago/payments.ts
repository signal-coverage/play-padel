import { Payment as MercadoPagoPayment } from "mercadopago";
import { getClubMercadoPagoClient } from "./clubMercadoPagoClient";

export interface MercadoPagoPaymentStatus {
  id: number;
  status: string; // "approved" | "pending" | "rejected" | "cancelled" | ...
  externalReference: string | null;
  transactionAmount: number | null;
}

// The webhook body only carries a payment id — never trust its other fields.
// This re-fetches the payment directly from Mercado Pago's API, authenticated
// with the OWNING CLUB's access token (a seller-OAuth payment generally can't
// be read with a different account's token) as the actual source of truth
// for its status. Callers must resolve `clubId` (e.g. via the reservation the
// payment belongs to) BEFORE calling this — see
// app/api/webhooks/mercadopago/route.ts.
export async function getMercadoPagoPayment(
  paymentId: string,
  clubId: string,
): Promise<MercadoPagoPaymentStatus> {
  const client = await getClubMercadoPagoClient(clubId);
  const payment = new MercadoPagoPayment(client);
  const result = await payment.get({ id: paymentId });
  return {
    id: result.id!,
    status: result.status ?? "unknown",
    externalReference: result.external_reference ?? null,
    transactionAmount: result.transaction_amount ?? null,
  };
}

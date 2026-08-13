import { Payment as MercadoPagoPayment } from "mercadopago";
import { getMercadoPagoClient } from "./client";

export interface MercadoPagoPaymentStatus {
  id: number;
  status: string; // "approved" | "pending" | "rejected" | "cancelled" | ...
  externalReference: string | null;
  transactionAmount: number | null;
}

// The webhook body only carries a payment id — never trust its other fields.
// This re-fetches the payment directly from Mercado Pago's API (authenticated
// with our own access token) as the actual source of truth for its status.
export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPaymentStatus> {
  const payment = new MercadoPagoPayment(getMercadoPagoClient());
  const result = await payment.get({ id: paymentId });
  return {
    id: result.id!,
    status: result.status ?? "unknown",
    externalReference: result.external_reference ?? null,
    transactionAmount: result.transaction_amount ?? null,
  };
}

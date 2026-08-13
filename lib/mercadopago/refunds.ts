import { PaymentRefund } from "mercadopago";
import { getMercadoPagoClient } from "./client";

// Refunds the full amount of a Mercado Pago payment via the SDK's own
// PaymentRefund client (same class-based pattern as Preference and Payment
// in this directory), rather than a hand-rolled fetch(). Going through the
// SDK's REST client means the idempotency key and auth/retry handling are
// attached automatically and stay consistent with the rest of the
// integration. `total()` (not `create()`) is used because we always refund
// the entire payment — no partial-amount body is needed.
export async function refundMercadoPagoPayment(
  paymentId: string,
): Promise<void> {
  const paymentRefund = new PaymentRefund(getMercadoPagoClient());
  await paymentRefund.total({ payment_id: paymentId });
}

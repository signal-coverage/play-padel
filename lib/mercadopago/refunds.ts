import { PaymentRefund } from "mercadopago";
import { getClubMercadoPagoClient } from "./clubMercadoPagoClient";

// Refunds the full amount of a Mercado Pago payment via the SDK's own
// PaymentRefund client (same class-based pattern as Preference and Payment
// in this directory), rather than a hand-rolled fetch(). Going through the
// SDK's REST client means the idempotency key and auth/retry handling are
// attached automatically and stay consistent with the rest of the
// integration. `total()` (not `create()`) is used because we always refund
// the entire payment — no partial-amount body is needed.
//
// Refunds MUST come from the same club's account that received the funds —
// there is no silent fallback to the platform token or another club's token
// (see design.md's "Handling of Externally Revoked Authorization").
export async function refundMercadoPagoPayment(
  paymentId: string,
  clubId: string,
): Promise<void> {
  const client = await getClubMercadoPagoClient(clubId);
  const paymentRefund = new PaymentRefund(client);
  await paymentRefund.total({ payment_id: paymentId });
}

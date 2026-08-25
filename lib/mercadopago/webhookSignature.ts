import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";

export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  /**
   * Overrides which secret validates the signature. Each webhook URL
   * registered in the Mercado Pago DevPanel gets its OWN signing secret, so
   * a second webhook (e.g. the membership subscription webhook) must be
   * able to validate against a different env-sourced secret than the
   * reservation webhook's `MERCADOPAGO_WEBHOOK_SECRET`, without
   * duplicating this HMAC verification logic. Omit to keep the existing
   * behavior (reads `MERCADOPAGO_WEBHOOK_SECRET`).
   */
  secret?: string;
}): boolean {
  const secret = params.secret ?? process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !params.xSignature || !params.xRequestId || !params.dataId) {
    return false;
  }
  try {
    WebhookSignatureValidator.validate({
      xSignature: params.xSignature,
      xRequestId: params.xRequestId,
      dataId: params.dataId,
      secret,
    });
    return true;
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) return false;
    throw err;
  }
}

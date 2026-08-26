import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";

export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
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

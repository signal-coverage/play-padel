// Resolves Mercado Pago's client-side PUBLIC key (never the platform's
// private access token, which only ever lives server-side — see
// lib/mercadopago/platformClient.ts). `null` when unset, so callers can
// show a clear configuration error instead of letting the Brick fail
// silently.
export function resolvePublicKey(): string | null {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? null;
}

// Resolves Mercado Pago's client-side PUBLIC key (never the platform's
// private access token, which only ever lives server-side — see
// lib/mercadopago/platformClient.ts). `null` when unset, so callers can
// show a clear configuration error instead of letting the Brick fail
// silently.
export function resolvePublicKey(): string | null {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? null;
}

// `t` comes from the caller's own useTranslations("CardTokenForm") result —
// this is a plain util, not a component, so it can't call useTranslations
// itself (same convention as MercadoPagoConnectionCard/utils.ts).
export type CardTokenFormT = (key: string) => string;

// The Brick's own `IBrickError.message` is NOT guaranteed to be human
// text. `cause` is a broad, documented bucket (e.g.
// `missing_payment_information` — MP's own docs: "Incomplete payment
// fields for some reason (fees, card issuer, payment_method_id)"); the
// SPECIFIC, undocumented detail actually lands in `.message` instead —
// verified live via a real onError payload entering a made-up card number
// (not one of MP's own official test cards):
// `{ type: "non_critical", cause: "missing_payment_information", message:
// "no_payment_method_for_provided_bin" }`. Only mapping messages we've
// actually seen arrive this way (as a raw snake_case code, not prose);
// every other Brick error's `.message` is real prose already (e.g.
// "invalid card number"), so it's left untouched.
const KNOWN_ERROR_MESSAGE_KEYS: Record<string, string> = {
  no_payment_method_for_provided_bin: "unrecognizedCard",
};

export function resolveCardErrorMessage(
  error: { cause?: string; message?: string },
  t: CardTokenFormT,
): string {
  const mappedKey = error.message
    ? KNOWN_ERROR_MESSAGE_KEYS[error.message]
    : undefined;
  return mappedKey ? t(mappedKey) : (error.message ?? t("genericCardError"));
}

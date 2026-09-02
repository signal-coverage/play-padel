// Resolves Mercado Pago's client-side PUBLIC key (never the platform's
// private access token, which only ever lives server-side — see
// lib/mercadopago/platformClient.ts). `null` when unset, so callers can
// show a clear configuration error instead of letting the Brick fail
// silently.
export function resolvePublicKey(): string | null {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? null;
}

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
const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  no_payment_method_for_provided_bin:
    "We don't recognize that card. Double-check the number, or try a different card.",
};

export function resolveCardErrorMessage(error: {
  cause?: string;
  message?: string;
}): string {
  const mapped = error.message
    ? KNOWN_ERROR_MESSAGES[error.message]
    : undefined;
  return (
    mapped ?? error.message ?? "We couldn't validate your card. Try again."
  );
}

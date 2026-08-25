"use client";

import { useEffect, useRef } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { StatusBox } from "@/components/StatusBox";
import { resolvePublicKey } from "./utils";
import type { CardTokenFormProps } from "./types";

// Module-level guard: `initMercadoPago` should only run once per page load
// (MP's own docs pattern shows it called at app bootstrap, not per-mount) —
// this component can mount/unmount across the checkout wizard's steps
// (e.g. going "back" from the card step to plan selection and forward
// again), so a plain module-level flag is enough to make repeat mounts a
// no-op instead of re-initializing the SDK each time.
let hasInitialized = false;

// Thin wrapper around Mercado Pago's CardPayment Brick
// (@mercadopago/sdk-react) — deliberately chosen over hand-rolling raw card
// fields via the vanilla @mercadopago/sdk-js: the Brick is MP's own
// drop-in, PCI-scope-reducing UI (raw card number/CVV never touch our own
// state or servers), which is the safer default for a real payment
// integration. See this batch's apply-progress for the full scoping
// rationale (design.md was silent on the exact client-side tokenization
// mechanism).
//
// NOTE (unverified against a live Brick, flagged as a risk — same class of
// caution as this change's other MP-SDK-shape inferences, e.g. batch 6's
// `summarized` webhook mapping): the exact runtime shape of `onSubmit`'s
// first argument is asserted from the installed SDK's own `.d.ts`
// (`ICardPaymentFormData`, which types `token` as the tokenized card id) —
// not yet exercised against a real, live-rendered Brick in a browser.
export function CardTokenForm({
  amount,
  payerEmail,
  onTokenReady,
  onError,
}: CardTokenFormProps) {
  const publicKey = resolvePublicKey();
  const hasReportedMissingKey = useRef(false);

  useEffect(() => {
    if (!publicKey || hasInitialized) return;
    initMercadoPago(publicKey, { locale: "es-AR" });
    hasInitialized = true;
  }, [publicKey]);

  useEffect(() => {
    if (publicKey || hasReportedMissingKey.current) return;
    hasReportedMissingKey.current = true;
    onError(
      "Card payments are not configured for this environment. Contact support.",
    );
  }, [publicKey, onError]);

  if (!publicKey) {
    return (
      <StatusBox className="text-sm text-muted-foreground">
        Card payments are not available right now. Please try again later.
      </StatusBox>
    );
  }

  return (
    <CardPayment
      initialization={{
        amount,
        payer: payerEmail ? { email: payerEmail } : undefined,
      }}
      onSubmit={async (formData) => {
        onTokenReady({ cardTokenId: formData.token });
      }}
      onError={(param) => {
        onError(param.message ?? "We couldn't validate your card. Try again.");
      }}
    />
  );
}

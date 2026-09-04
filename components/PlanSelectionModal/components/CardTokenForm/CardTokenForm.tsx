"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { StatusBox } from "@/components/StatusBox";
import { resolveCardErrorMessage, resolvePublicKey } from "./utils";
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
// Deliberately NO `customization` prop for colors: an earlier version
// themed this to match the app's own light/dark palette, but a Brick only
// ever matches about half its surface that way (no documented font-family
// override exists at all — see MembershipCheckoutDrawer.tsx, which frames
// this in its own "Mercado Pago" branded card instead). Letting the Brick
// render its own real, MP-designed colors reads as an intentional
// third-party payment box rather than a mismatched, half-themed one.
//
// Sizing (padding/height/font-size) IS tightened, but via a plain CSS
// override in app/globals.css (`#cardPaymentBrick_container`), not this
// prop — verified live that the Brick sets those as literal inline CSS
// custom properties on its own container div, and several of them
// (`--input-min-height`, `--row-spacing`, `--row-gap`, `--label-spacing`)
// aren't in the documented `customVariables` JS API at all, only in the
// raw rendered CSS. An external stylesheet rule with `!important` can
// still reach them (inline style vs. a more specific rule, not a JS
// question); the `customization` prop cannot, since it only ever forwards
// the keys MP's own types document.
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
  identification,
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

  // `CardPayment`'s own effect tears down and rebuilds the Brick's iframe
  // (its cleanup calls `.unmount()`) whenever `initialization`/`onSubmit`/
  // `onError` change BY REFERENCE — that's literally its `useEffect` deps
  // array. These used to be inline object/function literals, so EVERY
  // re-render of this component created new ones — including the
  // re-render `onError` itself triggers upstream via `setCheckoutError`.
  // Verified live: typing an unrecognized card BIN fired `onError`, which
  // re-rendered this component, which hard-reset the Brick — the card
  // fields visibly went blank and reloaded mid-entry, with the error
  // message left showing underneath. MP's own docs confirm this is by
  // design, not a Brick bug: changing `initialization` data without going
  // through their controller "would lead to a duplication of the
  // Brick... and display an error." Memoizing these is the fix.
  const initialization = useMemo(
    () => ({
      amount,
      payer:
        payerEmail || identification
          ? { email: payerEmail, identification }
          : undefined,
    }),
    [amount, payerEmail, identification],
  );

  const handleSubmit = useCallback(
    async (formData: {
      token: string;
      payer?: {
        email?: string;
        identification?: { type: string; number: string };
      };
    }) => {
      onTokenReady({
        cardTokenId: formData.token,
        ...(formData.payer?.identification
          ? { identification: formData.payer.identification }
          : {}),
      });
    },
    [onTokenReady],
  );

  const handleError = useCallback(
    (param: { cause?: string; message?: string }) => {
      onError(resolveCardErrorMessage(param));
    },
    [onError],
  );

  if (!publicKey) {
    return (
      <StatusBox className="text-sm text-muted-foreground">
        Card payments are not available right now. Please try again later.
      </StatusBox>
    );
  }

  return (
    <CardPayment
      initialization={initialization}
      onSubmit={handleSubmit}
      onError={handleError}
      locale="en-US"
    />
  );
}

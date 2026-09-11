"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { BouncingBall } from "@/components/BouncingBall";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils/planPricing";
import { CardCollectionPanel } from "../CardCollectionPanel";
import { CardTokenForm } from "../CardTokenForm";
import { AwaitingConfirmationPanel } from "../AwaitingConfirmationPanel";
import { PaymentStepIndicator } from "./components/PaymentStepIndicator";
import { MP_BRAND_BLUE, stepVariants } from "./styles";
import type { MembershipCheckoutDrawerProps } from "./types";

// MONTHLY-only step: replaces the earlier in-Dialog card-collection UI.
// The plan-picker Dialog stays exactly where it is — this Sheet opens over
// it instead, reusing the same drawer component CourtFormSheet uses
// elsewhere, just widened for this one instance via `className` (per
// AGENTS.md's documented wide-drawer exception) rather than touching the
// shared default. `onPointerDownOutside` is prevented for the same reason
// CourtFormSheet prevents it: an accidental outside click shouldn't drop an
// in-progress checkout, and per AGENTS.md's "Sheet inside a Dialog" note,
// guarding the INNER (later-opened) content here is the fix for that
// layering interaction, not something the Dialog underneath needs to know
// about.
//
// Email and card entry are explicit steps/pages — like OnboardingWizard's
// own multi-step form, not two panels stacked in one scrollable column —
// per explicit request. `payerEmail` truthy already means "email
// verified", so it doubles as the step switch with no extra step state;
// `direction` (1 = forward, -1 = back) only exists to pick which way the
// slide transition below goes, mirroring OnboardingWizard's own use of it.
export function MembershipCheckoutDrawer({
  open,
  view,
  amount,
  payerEmail,
  defaultEmail,
  identification,
  saveIdentification,
  onSaveIdentificationChange,
  checkoutError,
  isSubmitting,
  isRefreshing,
  onOpenChange,
  onPayerEmailChange,
  onTokenReady,
  onCardError,
  onBack,
  onRefresh,
}: MembershipCheckoutDrawerProps) {
  const [direction, setDirection] = useState(1);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const isCardStep = payerEmail !== "";

  function handleVerified(email: string) {
    setDirection(1);
    onPayerEmailChange(email);
  }

  // Footer "Back" is contextual, same as OnboardingWizard's: on the card
  // step it returns to the email step instead of leaving the drawer
  // (`onPayerEmailChange("")` un-verifies the email, which is exactly
  // what flips `isCardStep` back to false) — only the very first step's
  // Back actually exits the checkout, same as a wizard's Back being
  // disabled (here: repurposed to exit) on its first step.
  function handleBack() {
    if (isCardStep) {
      setDirection(-1);
      onPayerEmailChange("");
      return;
    }
    onBack();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Add a payment method</SheetTitle>
          <SheetDescription>
            {formatCurrency(amount)} / month — verify your email, then enter
            your card details.
          </SheetDescription>
        </SheetHeader>

        {view === "collect-card" && (
          <PaymentStepIndicator current={isCardStep ? 1 : 0} />
        )}

        <div className="flex flex-1 flex-col overflow-y-auto px-4">
          {view === "collect-card" ? (
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              {isCardStep ? (
                <motion.div
                  key="card"
                  className="flex flex-1 flex-col"
                  custom={direction}
                  variants={stepVariants}
                  initial={shouldReduceMotion ? false : "enter"}
                  animate="center"
                  exit={shouldReduceMotion ? "center" : "exit"}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { duration: 0.25, ease: "easeInOut" }
                  }
                >
                  {/* Framed as its own "Mercado Pago" card instead of
                      trying to blend into this app's theme — mismatched
                      fonts inside an otherwise-matching form read as
                      broken, but the same mismatch inside a clearly
                      MP-branded box reads as "a trusted third-party
                      payment provider," which is what it actually is.
                      Background/border color are hardcoded (not this
                      app's `bg-popover`/`border` tokens, and NOT theme-
                      aware) on purpose: Mercado Pago's own brand is
                      light-blue-on-white regardless of our dark/light
                      toggle, and `#3483FA` was sampled live from
                      mercadopago.com.ar's own buttons/logo, not guessed. */}
                  <div
                    className="flex flex-1 flex-col overflow-hidden rounded-sm border bg-white shadow-sm"
                    style={{ borderColor: `${MP_BRAND_BLUE}4d` }}
                  >
                    <div
                      className="flex items-center gap-1.5 border-b px-2 py-1"
                      style={{
                        borderColor: `${MP_BRAND_BLUE}26`,
                        backgroundColor: `${MP_BRAND_BLUE}0d`,
                      }}
                    >
                      <Lock
                        className="size-3.5"
                        style={{ color: MP_BRAND_BLUE }}
                        aria-hidden="true"
                      />
                      <span
                        className="text-xs font-semibold"
                        style={{ color: MP_BRAND_BLUE }}
                      >
                        Mercado Pago
                      </span>
                    </div>

                    {checkoutError && (
                      // Reserved for OUR backend rejecting an
                      // already-tokenized card (see PlanSelectionModal's
                      // `handleTokenReady`) — never the Brick's own
                      // validation errors, which it already renders itself
                      // (see PlanSelectionModal's `onCardError` wiring).
                      // Positioned right below the header, above the card
                      // fields: a short drawer needed a scroll to even
                      // notice this when it lived below the Brick's own
                      // "Pay" button. Same icon + tinted-strip language as
                      // the header above, just `border-b` (separating it
                      // from what's below) instead of `border-t`.
                      <div
                        role="alert"
                        className="flex items-center gap-1.5 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                      >
                        <span className="shrink-0">
                          <BouncingBall
                            size={14}
                            amplitude={4}
                            fill="var(--destructive)"
                            stroke="color-mix(in oklch, var(--destructive) 70%, black)"
                          />
                        </span>
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    {identification && (
                      // Rendered here, OUTSIDE the Brick's own iframe
                      // content (never passed as an `initialization` prop
                      // into it) — the Brick controls its own internal
                      // fields entirely; this only toggles whether WE save
                      // whatever identification the owner confirms. Only
                      // shown when an identification value actually exists
                      // to offer saving (the club's own taxId, or a
                      // previously-saved one) — nothing to save otherwise.
                      <div className="flex items-center gap-2 px-3 pt-2">
                        <Checkbox
                          id="save-identification"
                          checked={saveIdentification}
                          onCheckedChange={(checked) =>
                            onSaveIdentificationChange(checked === true)
                          }
                        />
                        <Label
                          htmlFor="save-identification"
                          className="text-xs font-normal text-muted-foreground"
                        >
                          Save this ID for future payments
                        </Label>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-0">
                      <CardTokenForm
                        amount={amount}
                        payerEmail={payerEmail}
                        identification={identification}
                        onTokenReady={onTokenReady}
                        onError={onCardError}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="email"
                  custom={direction}
                  variants={stepVariants}
                  initial={shouldReduceMotion ? false : "enter"}
                  animate="center"
                  exit={shouldReduceMotion ? "center" : "exit"}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { duration: 0.25, ease: "easeInOut" }
                  }
                >
                  <CardCollectionPanel
                    payerEmail={payerEmail}
                    defaultEmail={defaultEmail}
                    onPayerEmailChange={handleVerified}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <AwaitingConfirmationPanel
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              openedExternalTab={false}
            />
          )}
        </div>

        {view === "collect-card" && (
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

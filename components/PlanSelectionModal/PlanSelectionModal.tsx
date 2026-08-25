"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBox } from "@/components/StatusBox";
import type { Plan } from "@/core/clubs/types";
import type { MembershipRenewalModeValue } from "@/core/billing/services/membership.service";
import { AWAITING_CONFIRMATION_POLL_INTERVAL_MS } from "./consts";
import {
  useInitiateMembershipCheckout,
  useMembershipSubscription,
} from "./hooks";
import { resolveCheckoutAmount, resolveServerStep } from "./utils";
import { toCycleValue } from "./types";
import type { BillingCycle, LocalStep, PlanSelectionModalProps } from "./types";
import { SelectPlanPanel } from "./components/SelectPlanPanel";
import { CardCollectionPanel } from "./components/CardCollectionPanel";
import { AwaitingConfirmationPanel } from "./components/AwaitingConfirmationPanel";
import { ConfirmedPanel } from "./components/ConfirmedPanel";

// Shared checkout wizard consumed by three call sites (PaymentActivationScreen,
// UpgradeMembershipButton on the dashboard home, and — read-only preview
// aside — this is the only place that ever calls
// `POST /api/clubs/membership`. Step machine: the server snapshot decides
// loading/error/confirmed/select; once the owner starts a checkout attempt,
// a local step (`collect-card` for MONTHLY, `awaiting-confirmation` for
// both cycles once a checkout call succeeds) takes over — except
// "confirmed" always wins once the server snapshot says so, per spec's
// "Webhook-Only State Confirmation": no local step can fake that state.
export function PlanSelectionModal({
  open,
  onOpenChange,
}: PlanSelectionModalProps) {
  const [localStep, setLocalStep] = useState<LocalStep | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [syncedPlan, setSyncedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [renewalMode, setRenewalMode] =
    useState<MembershipRenewalModeValue>("AUTO");
  const [payerEmail, setPayerEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [openedExternalTab, setOpenedExternalTab] = useState(false);
  const [payNowError, setPayNowError] = useState<string | null>(null);
  // Live-polling flag for the "Pay Now" (mid-trial ANNUAL conversion) path
  // (sdd-verify follow-up fix): unlike the other checkout flows, "Pay Now"
  // is triggered from the ALREADY-confirmed panel (subscription is
  // TRIALING), so `isAwaitingConfirmation` (a LOCAL step, never entered
  // here) can't drive polling. Without this, the confirmed panel would
  // never learn about the webhook-driven TRIALING -> ACTIVE transition
  // until the owner manually closed and reopened the modal — there is no
  // "Check again" button on ConfirmedPanel.
  const [isAwaitingPayNowConfirmation, setIsAwaitingPayNowConfirmation] =
    useState(false);
  const checkoutTabRef = useRef<Window | null>(null);
  // Tracks the subscription status seen on the PREVIOUS render so the tab
  // auto-close effect below can detect a genuine TRIALING/PENDING -> ACTIVE
  // transition, instead of a boolean ("confirmed") that is already `true`
  // throughout TRIALING -> ACTIVE and therefore never toggles.
  const previousStatusRef = useRef<string | undefined>(undefined);

  const isAwaitingConfirmation = localStep === "awaiting-confirmation";
  const {
    data: subscription,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useMembershipSubscription({
    enabled: open,
    refetchIntervalMs:
      isAwaitingConfirmation || isAwaitingPayNowConfirmation
        ? AWAITING_CONFIRMATION_POLL_INTERVAL_MS
        : false,
  });
  const initiateCheckout = useInitiateMembershipCheckout();

  const serverStep = resolveServerStep({
    isLoading,
    isError,
    subscription: subscription ?? null,
  });
  const isConfirmed = serverStep === "confirmed";
  const step = isConfirmed ? "confirmed" : (localStep ?? serverStep);

  // Seed the locally-selected plan from the loaded subscription, exactly
  // once per actual change — same "adjust state during render" pattern as
  // PaymentActivationScreen's previous version of this sync.
  if (subscription && subscription.plan !== syncedPlan && localStep === null) {
    setSyncedPlan(subscription.plan);
    setSelectedPlan(subscription.plan);
    setRenewalMode(subscription.renewalMode);
  }

  // Best-effort auto-close of the MP checkout tab — per spec's "UI Label
  // Reflects Confirmed Payment State" ("the payment tab SHOULD auto-close
  // on confirmation... if technically feasible"). `checkoutTabRef` always
  // holds the MOST RECENTLY opened tab (the original ANNUAL checkout in
  // `handleContinue`, or a later "Pay Now" attempt in `handlePayNow` made
  // while already TRIALING — both write to the same ref), so there's never
  // a stale reference to worry about.
  //
  // sdd-verify follow-up fix: this previously watched `isConfirmed`
  // (true for BOTH TRIALING and ACTIVE, per `isMembershipConfirmed`).
  // That broke the "Pay Now" tab specifically: it's opened while the
  // subscription is ALREADY TRIALING (already "confirmed"), so
  // `isConfirmed` never toggles across the later TRIALING -> ACTIVE
  // webhook confirmation and the effect never re-fires. Tracking the
  // actual status transition to ACTIVE (via `previousStatusRef`) fixes
  // both the original PENDING -> ACTIVE flow and the pay-now
  // TRIALING -> ACTIVE flow. Also turns off "Pay Now" polling once
  // confirmed, since there's nothing left to wait for.
  useEffect(() => {
    const currentStatus = subscription?.status;
    const justBecameActive =
      currentStatus === "ACTIVE" && previousStatusRef.current !== "ACTIVE";
    previousStatusRef.current = currentStatus;

    if (!justBecameActive) return;

    setIsAwaitingPayNowConfirmation(false);

    if (!checkoutTabRef.current) return;
    try {
      checkoutTabRef.current.close();
    } catch {
      // Best-effort — the owner can close the MP tab manually.
    }
    checkoutTabRef.current = null;
  }, [subscription?.status]);

  function resetWizard() {
    setLocalStep(null);
    setCheckoutError(null);
    setPayerEmail("");
    setOpenedExternalTab(false);
    setPayNowError(null);
    setIsAwaitingPayNowConfirmation(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetWizard();
    onOpenChange(next);
  }

  function handleContinue() {
    if (!selectedPlan) return;
    setCheckoutError(null);

    if (billingCycle === "annual") {
      initiateCheckout.mutate(
        { plan: selectedPlan, cycle: "ANNUAL" },
        {
          onSuccess: (data) => {
            if (data.checkoutUrl) {
              checkoutTabRef.current = window.open(data.checkoutUrl, "_blank");
              setOpenedExternalTab(true);
            }
            setLocalStep("awaiting-confirmation");
          },
          onError: (err) => setCheckoutError(err.message),
        },
      );
      return;
    }

    setLocalStep("collect-card");
  }

  // "Pay now" during an ANNUAL trial (sdd-verify follow-up fix): generates
  // the one-time payment link for a subscription that's already TRIALING
  // on the ANNUAL cycle — see app/api/clubs/membership/route.ts's TRIALING
  // branch. Status stays TRIALING (only the webhook confirms payment), so
  // this never navigates away from the confirmed panel; it just opens the
  // MP checkout tab, same as the initial ANNUAL flow.
  function handlePayNow() {
    if (!subscription) return;
    setPayNowError(null);
    initiateCheckout.mutate(
      { plan: subscription.plan, cycle: "ANNUAL" },
      {
        onSuccess: (data) => {
          if (data.checkoutUrl) {
            checkoutTabRef.current = window.open(data.checkoutUrl, "_blank");
            // Start live polling so the confirmed panel picks up the
            // webhook-driven TRIALING -> ACTIVE transition on its own —
            // there's no "Check again" button on this panel to fall back
            // on. Turned off by the tab-close effect above once ACTIVE.
            setIsAwaitingPayNowConfirmation(true);
          }
        },
        onError: (err) => setPayNowError(err.message),
      },
    );
  }

  function handleTokenReady({ cardTokenId }: { cardTokenId: string }) {
    if (!selectedPlan) return;
    setCheckoutError(null);
    initiateCheckout.mutate(
      {
        plan: selectedPlan,
        cycle: "MONTHLY",
        renewalMode,
        payerEmail,
        cardTokenId,
      },
      {
        onSuccess: () => setLocalStep("awaiting-confirmation"),
        onError: (err) => setCheckoutError(err.message),
      },
    );
  }

  const checkoutAmount = selectedPlan
    ? resolveCheckoutAmount(selectedPlan, toCycleValue(billingCycle))
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Membership</DialogTitle>
          <DialogDescription>
            Choose a plan and billing cycle to activate your club&apos;s
            membership.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-80 w-full" />
            ))}
          </div>
        )}

        {step === "error" && (
          <StatusBox className="flex flex-col items-center justify-center gap-3 py-16">
            <p>We couldn&apos;t load your membership. Try again.</p>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </StatusBox>
        )}

        {step === "confirmed" && (
          <ConfirmedPanel
            onClose={() => handleOpenChange(false)}
            isTrialing={subscription?.status === "TRIALING"}
            showPayNow={
              subscription?.status === "TRIALING" &&
              subscription?.cycle === "ANNUAL"
            }
            onPayNow={handlePayNow}
            isPayNowLoading={initiateCheckout.isPending}
            payNowError={payNowError}
          />
        )}

        {step === "select" && (
          <SelectPlanPanel
            selectedPlan={selectedPlan}
            billingCycle={billingCycle}
            renewalMode={renewalMode}
            errorMessage={checkoutError}
            isSubmitting={initiateCheckout.isPending}
            onSelectPlan={setSelectedPlan}
            onBillingCycleChange={setBillingCycle}
            onRenewalModeChange={setRenewalMode}
            onContinue={handleContinue}
          />
        )}

        {step === "collect-card" && (
          <CardCollectionPanel
            amount={checkoutAmount ?? 0}
            payerEmail={payerEmail}
            errorMessage={checkoutError}
            isSubmitting={initiateCheckout.isPending}
            onPayerEmailChange={setPayerEmail}
            onTokenReady={handleTokenReady}
            onCardError={setCheckoutError}
            onBack={() => setLocalStep(null)}
          />
        )}

        {step === "awaiting-confirmation" && (
          <AwaitingConfirmationPanel
            onRefresh={() => refetch()}
            isRefreshing={isFetching}
            openedExternalTab={openedExternalTab}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

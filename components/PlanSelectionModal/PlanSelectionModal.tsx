"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fireSuccessCelebration } from "@/lib/utils/celebration";
import { useAuth } from "@/hooks/use-auth";
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
import { cn } from "@/lib/utils/utils";
import type { Plan } from "@/core/clubs/types";
import type { MembershipRenewalModeValue } from "@/core/billing/services/membership.service";
import { AWAITING_CONFIRMATION_POLL_INTERVAL_MS } from "./consts";
import {
  useChangeTrialPlan,
  useCurrentClubTaxId,
  useInitiateMembershipCheckout,
  useMembershipSubscription,
} from "./hooks";
import {
  resolveCheckoutAmount,
  resolveCheckoutErrorMessage,
  resolveServerStep,
} from "./utils";
import { toCycleValue } from "./types";
import type { BillingCycle, LocalStep, PlanSelectionModalProps } from "./types";
import { SelectPlanPanel } from "./components/SelectPlanPanel";
import { ChangePlanDialog } from "./components/ChangePlanDialog";
import { MembershipCheckoutDrawer } from "./components/MembershipCheckoutDrawer";
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
//
// The plan-picker Dialog only ever shows loading/error/confirmed/select —
// MONTHLY's card-collection ("collect-card", then its own
// "awaiting-confirmation") never renders inside it. That whole part of the
// flow lives in `MembershipCheckoutDrawer`, a Sheet opened alongside the
// still-visible Dialog instead of replacing its content, per explicit
// direction to keep the plan picker exactly where it is. ANNUAL's
// "awaiting-confirmation" (no card collection — it opens MP's hosted
// checkout tab directly) is unaffected and still renders in the Dialog, so
// `billingCycle` is what tells the two "awaiting-confirmation" moments
// apart below.
export function PlanSelectionModal({
  open,
  onOpenChange,
}: PlanSelectionModalProps) {
  // The owner's own account email — pre-fills MembershipCheckoutDrawer's
  // email step so most owners can just click Verify instead of retyping
  // an address they're already logged in with.
  const { user } = useAuth();
  const [localStep, setLocalStep] = useState<LocalStep | null>(null);
  // Controls the separate `ChangePlanDialog` (the 4-card picker) — opened
  // from SelectPlanPanel's "Change Plan" button, stacked over this Dialog
  // rather than replacing its content in place.
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [syncedPlan, setSyncedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [renewalMode, setRenewalMode] =
    useState<MembershipRenewalModeValue>("AUTO");
  const [payerEmail, setPayerEmail] = useState("");
  // Default true: a convenience toggle for saving the club's own
  // already-known, non-sensitive-beyond-Settings tax id — not an
  // opt-in-by-default risk (see identification derivation below, which only
  // ever offers the checkbox at all when something is actually known to
  // save).
  const [saveIdentification, setSaveIdentification] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [openedExternalTab, setOpenedExternalTab] = useState(false);
  const [payNowError, setPayNowError] = useState<string | null>(null);
  const [changePlanError, setChangePlanError] = useState<string | null>(null);
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
  const shouldReduceMotion = useReducedMotion() ?? false;

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
  const changeTrialPlan = useChangeTrialPlan();
  const { data: clubTaxId } = useCurrentClubTaxId();

  // Prefill precedence: whatever identification the owner already
  // confirmed and saved on a PREVIOUS checkout wins (mirrors exactly what
  // will actually be charged next time) — otherwise fall back to the
  // club's own onboarding-collected `Club.taxId` as a convenience default,
  // never an authoritative source (see route.ts's POST handler doc
  // comment). `undefined` when neither is known, which also hides the
  // "Save this ID for future payments" checkbox entirely (nothing to
  // offer saving).
  const identification =
    subscription?.payerIdentificationType &&
    subscription?.payerIdentificationNumber
      ? {
          type: subscription.payerIdentificationType,
          number: subscription.payerIdentificationNumber,
        }
      : clubTaxId
        ? { type: "CUIT", number: clubTaxId }
        : undefined;

  const serverStep = resolveServerStep({
    isLoading,
    isError,
    subscription: subscription ?? null,
  });
  const isConfirmed = serverStep === "confirmed";

  // MONTHLY's card-collection drawer covers both of its own local steps;
  // ANNUAL never enters "collect-card" at all (see handleContinue), so
  // billingCycle alone is enough to tell its "awaiting-confirmation" apart
  // from MONTHLY's.
  const isDrawerFlow =
    localStep === "collect-card" ||
    (localStep === "awaiting-confirmation" && billingCycle === "monthly");

  // The Dialog stays frozen on "select" for the whole drawer flow — it
  // never adopts "collect-card"/MONTHLY's "awaiting-confirmation" as its
  // own displayed step.
  const dialogStep = isConfirmed
    ? "confirmed"
    : isDrawerFlow
      ? "select"
      : (localStep ?? serverStep);

  // Seed the locally-selected plan from the loaded subscription, exactly
  // once per actual change — same "adjust state during render" pattern as
  // PaymentActivationScreen's previous version of this sync.
  if (subscription && subscription.plan !== syncedPlan && localStep === null) {
    setSyncedPlan(subscription.plan);
    setSelectedPlan(subscription.plan);
    setRenewalMode(subscription.renewalMode);
    // Latent staleness fix: this sync previously only ever set `plan`/
    // `renewalMode`, never `billingCycle` — so a club loaded on an ANNUAL
    // subscription could still show `ChangePlanDialog`'s MONTHLY pricing on
    // its cards (it takes `billingCycle` as a prop) if the dialog was
    // reopened after a fresh load, since `billingCycle` defaulted to
    // "monthly" and nothing ever corrected it from the server snapshot.
    setBillingCycle(subscription.cycle === "ANNUAL" ? "annual" : "monthly");
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
  //
  // Also fires the same success celebration as the player's own
  // payment-confirmed moment (PaymentReturnView) — this IS the owner's
  // equivalent: a genuine charge just settled (ACTIVE, never TRIALING —
  // ConfirmedPanel's own copy is explicit that a trial "has made no
  // payment yet"). `hadPreviousStatus` guards the one case
  // `justBecameActive` alone doesn't: an owner simply REOPENING the
  // dialog on an already-ACTIVE membership, where `previousStatusRef`
  // starts `undefined` and would otherwise look identical to a fresh
  // transition. The tab-close logic below doesn't need that same guard —
  // `checkoutTabRef.current` is already null in that exact case, making
  // it a no-op either way.
  useEffect(() => {
    const currentStatus = subscription?.status;
    const hadPreviousStatus = previousStatusRef.current !== undefined;
    const justBecameActive =
      currentStatus === "ACTIVE" && previousStatusRef.current !== "ACTIVE";
    previousStatusRef.current = currentStatus;

    if (!justBecameActive) return;

    if (hadPreviousStatus && !shouldReduceMotion) {
      fireSuccessCelebration();
    }

    setIsAwaitingPayNowConfirmation(false);

    if (!checkoutTabRef.current) return;
    try {
      checkoutTabRef.current.close();
    } catch {
      // Best-effort — the owner can close the MP tab manually.
    }
    checkoutTabRef.current = null;
  }, [subscription?.status, shouldReduceMotion]);

  // Hands the MONTHLY checkout drawer's own "awaiting-confirmation" view
  // off to the server-driven confirmed step the instant the server snapshot
  // agrees (TRIALING or ACTIVE) — `isDrawerFlow`/`isAwaitingConfirmation`
  // above only ever look at `localStep`, so without this the Sheet stayed
  // open forever polling on top of the already-confirmed Dialog underneath
  // (reproduced live and in PlanSelectionModal.test.tsx: MONTHLY's
  // synchronous trial-start confirmation flips `subscription.status` to
  // TRIALING in the same update that sets `localStep` to
  // "awaiting-confirmation", so both were true on the very same render).
  // Same "adjust state during render" pattern as the plan-sync block above,
  // not a `useEffect` — this is a plain derived-state reset in response to
  // `isConfirmed` flipping true, not a subscription to anything external.
  if (isConfirmed && localStep === "awaiting-confirmation") {
    setLocalStep(null);
  }

  function resetWizard() {
    setLocalStep(null);
    setCheckoutError(null);
    setPayerEmail("");
    setOpenedExternalTab(false);
    setPayNowError(null);
    setIsAwaitingPayNowConfirmation(false);
    setChangePlanError(null);
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
          onError: (err) =>
            setCheckoutError(resolveCheckoutErrorMessage(err.message)),
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
        onError: (err) =>
          setPayNowError(resolveCheckoutErrorMessage(err.message)),
      },
    );
  }

  // Changes plan tier IMMEDIATELY while still TRIALING (on EITHER cycle) —
  // no proration, since no real charge has happened yet either way. Reached
  // from ConfirmedPanel's own "Change Plan" button via ChangePlanDialog's
  // 4-card picker, same dialog SelectPlanPanel's pre-checkout "Change Plan"
  // button already opens — here `onSelectPlan` is rerouted to this handler
  // instead of `setSelectedPlan` (see the isConfirmed branch below) so
  // picking a card actually calls the server instead of just staging a
  // local selection for a checkout that's never started.
  function handleChangeTrialPlan(plan: Plan) {
    setChangePlanError(null);
    changeTrialPlan.mutate(plan, {
      onError: (err) =>
        setChangePlanError(resolveCheckoutErrorMessage(err.message)),
    });
  }

  // `useCallback`, not a plain function like this file's other handlers:
  // this one specifically flows down into CardTokenForm as `onTokenReady`,
  // which memoizes the Brick's `onSubmit` keyed on THIS reference (see
  // CardTokenForm.tsx). A plain function here would still be a new
  // reference every time this component re-renders — including the
  // re-render `onCardError`/`setCheckoutError` itself triggers on a card
  // validation error — defeating that memoization at the one call site
  // that actually needs it. Verified live: without this, the Brick still
  // tore itself down on every card error even after CardTokenForm's own
  // fix, because the reference feeding it kept changing one level up.
  //
  // Depends on `initiateCheckout.mutate`, NOT the whole `initiateCheckout`
  // object — verified against the installed TanStack Query's own source
  // (`useMutation.ts`): it returns a brand-new `{ ...result, mutate,
  // mutateAsync }` object literal on every single render regardless of
  // whether anything actually changed, while `.mutate` itself is the part
  // that's genuinely stable (memoized internally on the observer). Using
  // the whole object here would have silently defeated this useCallback on
  // every render, same failure mode as this comment is fixing.
  const handleTokenReady = useCallback(
    ({
      cardTokenId,
      identification: confirmedIdentification,
    }: {
      cardTokenId: string;
      identification?: { type: string; number: string };
    }) => {
      if (!selectedPlan) return;
      setCheckoutError(null);
      // Never send `saveIdentification: true` with no identification —
      // only persist when BOTH the checkbox is checked AND the Brick
      // actually confirmed one.
      const shouldSaveIdentification =
        saveIdentification && Boolean(confirmedIdentification);
      initiateCheckout.mutate(
        {
          plan: selectedPlan,
          cycle: "MONTHLY",
          renewalMode,
          payerEmail,
          cardTokenId,
          ...(shouldSaveIdentification
            ? {
                identification: confirmedIdentification,
                saveIdentification: true,
              }
            : {}),
        },
        {
          onSuccess: () => setLocalStep("awaiting-confirmation"),
          onError: (err) =>
            setCheckoutError(resolveCheckoutErrorMessage(err.message)),
        },
      );
    },
    // Deliberately NOT `initiateCheckout` (the whole object) — see the
    // comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedPlan,
      renewalMode,
      payerEmail,
      saveIdentification,
      initiateCheckout.mutate,
    ],
  );

  const checkoutAmount = selectedPlan
    ? resolveCheckoutAmount(selectedPlan, toCycleValue(billingCycle))
    : null;

  // The 4-card picker now lives entirely in `ChangePlanDialog`, so this
  // Dialog only ever shows the single-card plan summary (and its matching
  // loading skeleton below) — a bit wider than a plain form/status message,
  // but nowhere near the old 4-column width.
  const isPlanSummaryStep = dialogStep === "select" || dialogStep === "loading";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "max-h-[90vh] gap-6 overflow-y-auto p-6",
            isPlanSummaryStep ? "sm:max-w-2xl" : "sm:max-w-md",
          )}
          onPointerDownOutside={(e) => {
            // `ChangePlanDialog` and `MembershipCheckoutDrawer` are each a
            // separate `Dialog.Root`/`Sheet.Root`, not literally nested
            // inside THIS Dialog's own React/DOM tree (each is its own
            // portal to `document.body`) — verified live: without this,
            // clicking a plan card in `ChangePlanDialog` closed this
            // Membership dialog too, because Radix's own same-stack
            // awareness only suppresses a lower layer's outside-pointer-down
            // handling for layers it recognizes as nested, and these
            // separately-portaled dialogs don't register as nested to it.
            // Same root cause AGENTS.md documents for a Select/Popover/
            // Sheet's portal inside a Dialog, generalized to any dialog/
            // sheet content anywhere in the DOM instead of just this one's
            // own subtree.
            const target = e.detail.originalEvent.target as Element | null;
            if (
              target?.closest(
                '[data-slot="dialog-content"], [data-slot="sheet-content"]',
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Membership</DialogTitle>
            <DialogDescription>
              Choose a plan and billing cycle to activate your club&apos;s
              membership.
            </DialogDescription>
          </DialogHeader>

          {dialogStep === "loading" && (
            // Mirrors SelectPlanPanel's own collapsed shape (one card +
            // one equal-width action panel) instead of the old 4-column
            // grid, so loading doesn't finish into a visibly narrower
            // dialog.
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          )}

          {dialogStep === "error" && (
            <StatusBox className="flex flex-col items-center justify-center gap-3 py-16">
              <p>We couldn&apos;t load your membership. Try again.</p>
              <Button type="button" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </StatusBox>
          )}

          {dialogStep === "confirmed" && (
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
              onChangePlan={() => setIsChangingPlan(true)}
              isChangingPlan={changeTrialPlan.isPending}
              changePlanError={changePlanError}
            />
          )}

          {dialogStep === "select" && (
            <SelectPlanPanel
              selectedPlan={selectedPlan}
              billingCycle={billingCycle}
              renewalMode={renewalMode}
              // `checkoutError` also feeds MembershipCheckoutDrawer's own
              // error slot — the Dialog stays mounted underneath the
              // drawer the whole time (`isDrawerFlow` above), so without
              // this guard the drawer's own card-form error (e.g. an
              // unrecognized card BIN) rendered a SECOND time on this
              // now-hidden panel behind it. Verified live via an
              // accessibility snapshot — not visible to the eye since the
              // drawer covers it, but a real duplicate all the same.
              errorMessage={isDrawerFlow ? null : checkoutError}
              isSubmitting={initiateCheckout.isPending}
              onBillingCycleChange={setBillingCycle}
              onRenewalModeChange={setRenewalMode}
              onChangePlan={() => setIsChangingPlan(true)}
              onContinue={handleContinue}
            />
          )}

          {dialogStep === "awaiting-confirmation" && (
            <AwaitingConfirmationPanel
              onRefresh={() => refetch()}
              isRefreshing={isFetching}
              openedExternalTab={openedExternalTab}
            />
          )}
        </DialogContent>
      </Dialog>

      <ChangePlanDialog
        open={isChangingPlan}
        selectedPlan={selectedPlan}
        billingCycle={billingCycle}
        onOpenChange={setIsChangingPlan}
        onSelectPlan={isConfirmed ? handleChangeTrialPlan : setSelectedPlan}
      />

      <MembershipCheckoutDrawer
        open={isDrawerFlow}
        view={
          localStep === "collect-card"
            ? "collect-card"
            : "awaiting-confirmation"
        }
        amount={checkoutAmount ?? 0}
        payerEmail={payerEmail}
        defaultEmail={user?.email ?? undefined}
        identification={identification}
        saveIdentification={saveIdentification}
        onSaveIdentificationChange={setSaveIdentification}
        checkoutError={checkoutError}
        isSubmitting={initiateCheckout.isPending}
        isRefreshing={isFetching}
        onOpenChange={(next) => {
          if (!next) setLocalStep(null);
        }}
        onPayerEmailChange={setPayerEmail}
        onTokenReady={handleTokenReady}
        // Deliberately NOT `setCheckoutError` — the Brick already renders
        // its own error UI for its own validation failures (verified
        // live: MP shows e.g. "Something went wrong. Please try again
        // later." right above its own "Pay" button), so feeding the same
        // failure into `checkoutError` just showed it a second time, in
        // our own box, right next to MP's own. `checkoutError` is reserved
        // for `handleTokenReady`'s `onError` below — OUR backend rejecting
        // an already-tokenized card, which the Brick has no way to know
        // about and can't show anything for.
        onCardError={() => {}}
        onBack={() => setLocalStep(null)}
        onRefresh={() => refetch()}
      />
    </>
  );
}

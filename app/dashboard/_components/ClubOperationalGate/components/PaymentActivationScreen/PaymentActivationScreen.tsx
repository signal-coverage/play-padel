"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBox } from "@/components/StatusBox";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import { useMembershipSubscription } from "@/components/PlanSelectionModal/hooks";
import { isMembershipConfirmed } from "@/components/PlanSelectionModal/utils";
import { MercadoPagoConnectionCard } from "@/app/dashboard/settings/club/_components/MercadoPagoConnectionCard";
import { BankTransferAccountSettingsCard } from "@/app/dashboard/settings/club/_components/BankTransferAccountSettingsCard";
import { GateScreen } from "../GateScreen";
import { ActivationStepIndicator } from "./components/ActivationStepIndicator";
import { MEMBERSHIP_STATUS_LABELS } from "./consts";

// Cause A from spec's club-operational-gate-overlay domain: club finished
// registration but membership payment isn't confirmed yet — replaces the
// old McNotConnectedCard. Rendered directly as the dashboard's
// page-content when this cause is active (not a dialog), so it also
// surfaces the "Pay Membership" action (opens the shared
// `PlanSelectionModal`) before letting the owner configure a payout method,
// since spec's "Two Separate Membership Actions" requires both a confirmed
// membership payment AND a way to get paid (Mercado Pago OR a bank transfer
// account) before reservations can be accepted.
//
// Two real steps, not just a reveal-in-place: step 1 (membership) is the
// only thing shown until it's confirmed, then step 2 (payout method)
// REPLACES it — mirroring MembershipCheckoutDrawer's own two-step shape.
// `currentStep` is derived from `isConfirmed`, not separate local state:
// once the checkout flow (PlanSelectionModal, or the awaiting-confirmation
// webhook poll it starts) actually confirms the subscription, this screen's
// own `useMembershipSubscription()` query picks that up and the step
// advances on its own — no manual "Next" click, since step 2 is gated
// behind a real precondition, not a free navigation choice. GateScreen's
// submitLabel/onSubmit are intentionally omitted (see GateScreen's
// optional-submit widening) — this screen has no single primary action of
// its own, each step's own content carries its own action(s).
export function PaymentActivationScreen() {
  const {
    data: subscription,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useMembershipSubscription();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isConfirmed = subscription
    ? isMembershipConfirmed(subscription.status)
    : false;
  const currentStep: 0 | 1 = isConfirmed ? 1 : 0;

  return (
    <GateScreen
      title="Payment activation"
      description="Your club needs an active membership and a way to receive reservation payments — connect Mercado Pago or add your bank account — before it can start accepting reservations."
      contentClassName={isConfirmed ? "max-w-3xl" : undefined}
    >
      <ActivationStepIndicator current={currentStep} />

      {isError ? (
        <div className="px-2 py-4">
          <StatusBox className="flex flex-col items-center justify-center gap-3 py-16">
            <p>We couldn&apos;t load your membership. Try again.</p>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </StatusBox>
        </div>
      ) : (isLoading || isFetching || !subscription) && !isConfirmed ? (
        // Stale-cache flash fix: `isLoading` alone is only true when there's
        // no cached data at all, not while a background refetch of existing
        // (possibly stale) data is in flight — e.g. right after an admin
        // activates a club's FREE plan out-of-band, or simply switching
        // browser tabs. Also gating on `isFetching` keeps the skeleton
        // showing for exactly as long as needed instead of flashing a stale
        // step-0 "Pay Membership" before the fresh data corrects it. Once
        // truly CONFIRMED, a background refetch is low-stakes, so
        // `!isConfirmed` stops gating on `isFetching` from that point on.
        // `!subscription` preserves the original safety net for a
        // genuinely-null subscription (e.g. a 404) — never falling through
        // to code that reads subscription.plan/status on a null value.
        <div className="px-2 py-4">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : currentStep === 0 && subscription ? (
        <div className="flex flex-col gap-4 px-2 py-4">
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {subscription.plan} ·{" "}
                {subscription.cycle === "MONTHLY" ? "Monthly" : "Annual"}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: {MEMBERSHIP_STATUS_LABELS[subscription.status]}
              </p>
            </div>
            <Button type="button" onClick={() => setIsModalOpen(true)}>
              Pay Membership
            </Button>
          </div>
        </div>
      ) : (
        // Step 2 — two columns per AGENTS.md's documented wide-drawer/
        // two-column exception (GateScreen widened past its default
        // max-w-lg via contentClassName above): Mercado Pago on the left,
        // bank transfer on the right, separated by a vertical Separator.
        <div className="flex gap-6 px-2 py-4">
          <div className="flex flex-1 flex-col gap-4">
            <MercadoPagoConnectionCard />
          </div>
          <Separator orientation="vertical" />
          <div className="flex flex-1 flex-col gap-4">
            <BankTransferAccountSettingsCard />
          </div>
        </div>
      )}

      <PlanSelectionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </GateScreen>
  );
}

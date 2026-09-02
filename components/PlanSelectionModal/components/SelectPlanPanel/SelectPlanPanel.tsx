"use client";

import { Button } from "@/components/ui/button";
import { PlanOptionCard } from "@/app/dashboard/_components/ClubOperationalGate/components/PaymentActivationScreen/components/PlanOptionCard";
import { isAutomatedCheckoutAvailable } from "../../utils";
import { BillingCycleToggle } from "../BillingCycleToggle";
import { RenewalModeToggle } from "../RenewalModeToggle";
import type { SelectPlanPanelProps } from "./types";

// The modal's first step: review the club's plan tier, billing cycle, and
// renewal mode, per spec's "Two Separate Membership Actions". Reuses the
// existing `PlanOptionCard` (per this batch's explicit instruction to
// reuse, not rebuild it) instead of duplicating its rich visual treatment.
//
// Always shows just the current plan's own card, in an equal-width row next
// to "Change Plan" + the renewal toggle — the full 4-card picker lives in
// its own `ChangePlanDialog` now, opened from "Change Plan" rather than
// replacing this panel's own content in place. `selectedPlan` is only ever
// null for the brief instant before PlanSelectionModal's sync effect seeds
// it from the loaded subscription, so there's nothing meaningful to render
// yet in that instant.
export function SelectPlanPanel({
  selectedPlan,
  billingCycle,
  renewalMode,
  errorMessage,
  isSubmitting,
  onBillingCycleChange,
  onRenewalModeChange,
  onChangePlan,
  onContinue,
}: SelectPlanPanelProps) {
  if (!selectedPlan) return null;

  const canCheckout = isAutomatedCheckoutAvailable(selectedPlan);

  return (
    <div className="flex flex-col gap-6">
      <BillingCycleToggle
        value={billingCycle}
        onChange={onBillingCycleChange}
      />

      {/* `grid grid-cols-2` (not `flex`) so the card and the action panel
          split the row exactly evenly — `PlanOptionCard` carries its own
          `flex-1`, which only sizes it relative to a sibling inside a flex
          row, not to a fixed equal share of it. */}
      <div className="grid grid-cols-2 gap-4">
        <PlanOptionCard
          plan={selectedPlan}
          isSelected
          billingCycle={billingCycle}
          onSelect={() => {}}
          index={0}
        />

        <div className="flex flex-col justify-between">
          <Button type="button" className="h-14" onClick={onChangePlan}>
            Change Plan
          </Button>

          <RenewalModeToggle
            value={renewalMode}
            onChange={onRenewalModeChange}
          />
        </div>
      </div>

      {!canCheckout && (
        <p className="text-xs text-muted-foreground">
          {selectedPlan} is a custom, contact-us tier — reach out to our team to
          get set up.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!canCheckout || isSubmitting}
        >
          {isSubmitting ? "Starting checkout…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

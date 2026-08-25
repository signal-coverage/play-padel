"use client";

import { useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/core/clubs/types";
import { PlanOptionCard } from "@/app/dashboard/_components/ClubOperationalGate/components/PaymentActivationScreen/components/PlanOptionCard";
import { PLAN_ORDER } from "../../consts";
import { isAutomatedCheckoutAvailable } from "../../utils";
import { BillingCycleToggle } from "../BillingCycleToggle";
import { RenewalModeToggle } from "../RenewalModeToggle";
import { resolveNextPlanOnArrowKey } from "./utils";
import type { SelectPlanPanelProps } from "./types";

// The modal's first step: pick a plan tier, a billing cycle, and (MONTHLY
// only) a renewal mode, per spec's "Two Separate Membership Actions" and
// "Monthly Billing Uses Real MP Preapproval". Reuses the existing
// `PlanOptionCard` grid (per this batch's explicit instruction to reuse,
// not rebuild it) instead of duplicating its rich visual treatment.
export function SelectPlanPanel({
  selectedPlan,
  billingCycle,
  renewalMode,
  errorMessage,
  isSubmitting,
  onSelectPlan,
  onBillingCycleChange,
  onRenewalModeChange,
  onContinue,
}: SelectPlanPanelProps) {
  const cardRefs = useRef<Partial<Record<Plan, HTMLButtonElement | null>>>({});

  function handleGroupKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selectedPlan) return;
    const nextPlan = resolveNextPlanOnArrowKey(event.key, selectedPlan);
    if (!nextPlan) return;
    event.preventDefault();
    onSelectPlan(nextPlan);
    cardRefs.current[nextPlan]?.focus();
  }

  const canCheckout = selectedPlan
    ? isAutomatedCheckoutAvailable(selectedPlan)
    : false;

  return (
    <div className="flex flex-col gap-4">
      <BillingCycleToggle
        value={billingCycle}
        onChange={onBillingCycleChange}
      />

      <div
        role="radiogroup"
        aria-label="Plan"
        onKeyDown={handleGroupKeyDown}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {PLAN_ORDER.map((plan, index) => (
          <PlanOptionCard
            key={plan}
            ref={(el) => {
              cardRefs.current[plan] = el;
            }}
            plan={plan}
            isSelected={plan === selectedPlan}
            billingCycle={billingCycle}
            onSelect={onSelectPlan}
            index={index}
          />
        ))}
      </div>

      {billingCycle === "monthly" && (
        <RenewalModeToggle value={renewalMode} onChange={onRenewalModeChange} />
      )}

      {selectedPlan && !canCheckout && (
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
          disabled={!selectedPlan || !canCheckout || isSubmitting}
        >
          {isSubmitting ? "Starting checkout…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

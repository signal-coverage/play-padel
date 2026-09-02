"use client";

import { useRef, type KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Plan } from "@/core/clubs/types";
import { PlanOptionCard } from "@/app/dashboard/_components/ClubOperationalGate/components/PaymentActivationScreen/components/PlanOptionCard";
import { PLAN_ORDER } from "../../consts";
import { resolveNextPlanOnArrowKey } from "./utils";
import type { ChangePlanDialogProps } from "./types";

// A separate Dialog stacked over the Membership one (per AGENTS.md's
// documented "Dialog inside a Dialog" pattern), opened from
// SelectPlanPanel's "Change Plan" button — this owns the full 4-card
// picker now, instead of it replacing SelectPlanPanel's own content in
// place. `PlanOptionCard` already renders the selected plan in the app's
// primary color and every other one desaturated/grayed-out until picked
// (see PlanOptionCard/styles.ts) — nothing extra needed here for that.
// Picking a card selects it and closes this dialog in one action, dropping
// back to the Membership dialog underneath with the new plan already
// reflected.
//
// `onPointerDownOutside` prevented (verified live, not just theoretical):
// without it, clicking a plan card here closed BOTH this dialog AND the
// Membership one underneath. These are two independent `Dialog.Root`s, not
// one nested inside the other's own tree, so Radix's own same-stack
// awareness doesn't suppress the outer one's outside-pointer-down handling
// for a click that lands inside this dialog's (separately portaled)
// content — same root cause AGENTS.md documents for Select/Popover/Sheet
// inside a Dialog, fixed the same way MembershipCheckoutDrawer already
// fixes it for its own Sheet.
export function ChangePlanDialog({
  open,
  selectedPlan,
  billingCycle,
  onOpenChange,
  onSelectPlan,
}: ChangePlanDialogProps) {
  const cardRefs = useRef<Partial<Record<Plan, HTMLButtonElement | null>>>({});

  function handleGroupKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selectedPlan) return;
    const nextPlan = resolveNextPlanOnArrowKey(event.key, selectedPlan);
    if (!nextPlan) return;
    event.preventDefault();
    onSelectPlan(nextPlan);
    cardRefs.current[nextPlan]?.focus();
  }

  function handlePickPlan(plan: Plan) {
    onSelectPlan(plan);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] gap-6 overflow-y-auto p-6 sm:max-w-6xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Change Plan</DialogTitle>
          <DialogDescription>
            Pick a new plan for your club&apos;s membership.
          </DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label="Plan"
          onKeyDown={handleGroupKeyDown}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
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
              onSelect={handlePickPlan}
              index={index}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

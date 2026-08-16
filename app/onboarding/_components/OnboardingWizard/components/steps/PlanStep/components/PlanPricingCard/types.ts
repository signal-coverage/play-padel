import type { Plan } from "@/core/clubs/types";

export type BillingCycle = "monthly" | "annual";

export type PlanPricingCardProps = {
  // The currently selected plan, derived from COURT_RANGE_OPTIONS by the
  // parent PlanStep. Undefined before the owner picks a court range —
  // PlanPricingCard falls back to showing the first tier rather than an
  // empty state, so the card is never blank.
  plan: Plan | undefined;
  billingCycle: BillingCycle;
};

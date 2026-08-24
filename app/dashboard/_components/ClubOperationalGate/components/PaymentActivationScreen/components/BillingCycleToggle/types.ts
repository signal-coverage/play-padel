// Local to this folder on purpose — per this repo's SRP-per-folder
// convention, local types aren't imported across component folders even
// when conceptually identical. This is the same reasoning already spelled
// out in PaymentActivationScreen/types.ts's ClubPlanResponse comment and
// ClubOperationalGate/types.ts, applied here to the onboarding flow's
// PlanPricingCard/types.ts BillingCycle: that's a different feature folder,
// so this folder owns its own copy rather than importing it.
export type BillingCycle = "monthly" | "annual";

export type BillingCycleToggleProps = {
  value: BillingCycle;
  onChange: (value: BillingCycle) => void;
};

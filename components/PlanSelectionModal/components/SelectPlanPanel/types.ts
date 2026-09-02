import type { Plan } from "@/core/clubs/types";
import type { MembershipRenewalModeValue } from "@/core/billing/services/membership.service";
import type { BillingCycle } from "../../types";

export type SelectPlanPanelProps = {
  selectedPlan: Plan | null;
  billingCycle: BillingCycle;
  renewalMode: MembershipRenewalModeValue;
  errorMessage: string | null;
  isSubmitting: boolean;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  onRenewalModeChange: (mode: MembershipRenewalModeValue) => void;
  // Opens ChangePlanDialog — picking a plan there is what actually calls
  // back into PlanSelectionModal's `onSelectPlan`; this panel no longer
  // owns any plan-picking UI itself.
  onChangePlan: () => void;
  onContinue: () => void;
};

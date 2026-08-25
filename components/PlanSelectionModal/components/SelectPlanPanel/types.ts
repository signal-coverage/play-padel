import type { Plan } from "@/core/clubs/types";
import type { MembershipRenewalModeValue } from "@/core/billing/services/membership.service";
import type { BillingCycle } from "../../types";

export type SelectPlanPanelProps = {
  selectedPlan: Plan | null;
  billingCycle: BillingCycle;
  renewalMode: MembershipRenewalModeValue;
  errorMessage: string | null;
  isSubmitting: boolean;
  onSelectPlan: (plan: Plan) => void;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  onRenewalModeChange: (mode: MembershipRenewalModeValue) => void;
  onContinue: () => void;
};

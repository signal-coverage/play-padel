import type { Plan } from "@/core/clubs/types";
import type { BillingCycle } from "../../types";

export type ChangePlanDialogProps = {
  open: boolean;
  selectedPlan: Plan | null;
  billingCycle: BillingCycle;
  onOpenChange: (open: boolean) => void;
  onSelectPlan: (plan: Plan) => void;
};

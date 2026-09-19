import type { Plan } from "@/core/clubs/types";
import type { BillingCycle } from "../../types";

export type PricingCardProps = {
  plan: Plan;
  billingCycle: BillingCycle;
};

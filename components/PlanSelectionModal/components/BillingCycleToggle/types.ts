import type { BillingCycle } from "../../types";

export type BillingCycleToggleProps = {
  value: BillingCycle;
  onChange: (value: BillingCycle) => void;
};

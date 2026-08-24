import type { Ref } from "react";
import type { Plan } from "@/core/clubs/types";

// Local copy of BillingCycleToggle/types.ts's BillingCycle — per this
// repo's SRP-per-folder convention, local types aren't shared across
// component folders (same reasoning as this folder's own hexagonClipPath in
// styles.ts, kept as a local copy of PlanPricingCard/styles.ts's constant
// rather than imported).
export type BillingCycle = "monthly" | "annual";

export type PlanOptionCardProps = {
  plan: Plan;
  // Whether this is the plan currently chosen in the dialog's radiogroup —
  // drives both the visual "selected" state and the radio semantics
  // (aria-checked, roving tabIndex) the parent's arrow-key navigation
  // relies on.
  isSelected: boolean;
  // Mirrors PlanPricingCard's billingCycle prop: when "annual", the card
  // shows the annual-equivalent monthly price, the crossed-out monthly
  // price + "billed annually" line, and the "Save N months" badge instead
  // of the flat monthly price.
  billingCycle: BillingCycle;
  onSelect: (plan: Plan) => void;
  // This card's position in PLAN_ORDER — drives the stagger delay on its
  // one-time entrance animation (see styles.ts's getCardMotionTransition).
  // Not used for anything else; selection/keyboard nav stay plan-keyed.
  index: number;
  // Exposed so the parent can move DOM focus here when arrow-key
  // navigation changes the selection (React 19 supports `ref` as a plain
  // prop on function components, no forwardRef needed).
  ref?: Ref<HTMLButtonElement>;
};

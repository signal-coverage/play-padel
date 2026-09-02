import type { Plan } from "@/core/clubs/types";
import { PLAN_ORDER } from "../../consts";

// Pure roving-tabindex arrow-key helper for the plan radiogroup — mirrors
// PaymentActivationScreen.tsx's own `handleGroupKeyDown` logic exactly
// (same ARIA APG "radio group" pattern), extracted here as a standalone,
// unit-testable function instead of an inline handler.
export function resolveNextPlanOnArrowKey(
  key: string,
  currentPlan: Plan,
): Plan | null {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  if (key === "ArrowRight" || key === "ArrowDown") {
    return PLAN_ORDER[(currentIndex + 1) % PLAN_ORDER.length];
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return PLAN_ORDER[
      (currentIndex - 1 + PLAN_ORDER.length) % PLAN_ORDER.length
    ];
  }
  return null;
}

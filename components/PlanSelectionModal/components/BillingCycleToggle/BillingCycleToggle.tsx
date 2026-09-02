"use client";

import { cn } from "@/lib/utils/utils";
import { BILLING_CYCLE_OPTIONS } from "../../consts";
import type { BillingCycleToggleProps } from "./types";

// Monthly/annual pill toggle, same visual language as PlanStep.tsx's
// onboarding version — kept as its own local copy here per this repo's
// SRP-per-folder convention rather than importing across component trees.
// (The former PaymentActivationScreen/components/BillingCycleToggle copy
// was removed as dead code in Phase 10 — this shared PlanSelectionModal
// component fully superseded it once PaymentActivationScreen was wired to
// open the modal instead of rendering its own toggle, see Phase 7 notes.)
export function BillingCycleToggle({
  value,
  onChange,
}: BillingCycleToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex w-fit rounded-full border border-border p-1">
        {BILLING_CYCLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              value === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <span className="text-xs font-medium text-success">
        Save 2 months with annual billing
      </span>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils/utils";
import { BILLING_CYCLE_OPTIONS } from "./consts";
import type { BillingCycleToggleProps } from "./types";

// Monthly/annual pill toggle for the plan grid above it, mirroring
// PlanStep.tsx's existing toggle in the onboarding flow as closely as
// reasonable (same rounded-full bordered pair of buttons + the "Save 2
// months with annual billing" note) since this dialog needs the same
// billing-cycle choice. Kept as its own component here rather than
// imported from the onboarding tree per this repo's SRP-per-folder
// convention — see this folder's types.ts for the same reasoning applied
// to the BillingCycle type itself.
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

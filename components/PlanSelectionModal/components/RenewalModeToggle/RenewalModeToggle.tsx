"use client";

import { cn } from "@/lib/utils/utils";
import { RENEWAL_MODE_OPTIONS } from "../../consts";
import type { RenewalModeToggleProps } from "./types";

// MONTHLY-only choice between auto-renew and manual-renewal, per spec's
// "Monthly Billing Uses Real MP Preapproval" ("At selection, the owner MUST
// choose auto-renew or manual-renewal"). Implements the ARIA "radio" role
// on native <button>s, same pattern as PlanOptionCard's radiogroup — a
// two-option group is small enough that no roving-tabindex/arrow-key
// handling is needed here (Tab alone is a reasonable way to move between
// two options).
export function RenewalModeToggle({ value, onChange }: RenewalModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Renewal mode"
      className="flex flex-col gap-2"
    >
      {RENEWAL_MODE_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start rounded-md border px-3 py-2 text-left transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50",
            )}
          >
            <span className="text-sm font-medium text-foreground">
              {option.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

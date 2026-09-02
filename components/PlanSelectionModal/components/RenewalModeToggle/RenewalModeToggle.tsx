"use client";

import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { RENEWAL_MODE_OPTIONS } from "../../consts";
import type { RenewalModeToggleProps } from "./types";

// Choice between auto-renew and manual-renewal — no longer MONTHLY-only
// (ANNUAL now offers the same choice too). Each option is a real `<Button>`
// (the selected one filled/primary, matching SelectPlanPanel's "Change
// Plan" button), stacked one above the other, with its label + a short
// description both inside the button and left-aligned — a taller variant
// of the same button, not a separate info card next to it.
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
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            variant={isSelected ? "default" : "outline"}
            onClick={() => onChange(option.value)}
            className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left whitespace-normal"
          >
            <span className="text-sm font-medium">{option.label}</span>
            <span
              className={cn(
                "text-xs font-normal",
                isSelected
                  ? "text-primary-foreground/75"
                  : "text-muted-foreground",
              )}
            >
              {option.description}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

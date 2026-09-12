"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { COURT_FORM_STEP_LABELS } from "./consts";
import type { CourtFormStepIndicatorProps } from "./types";

// Same numbered-circle + connecting-line visual language as
// PaymentStepIndicator/ActivationStepIndicator/OnboardingWizard's own
// StepIndicator — and, like all three of those, purely visual now (no
// `onChange`, no button): a step only ever advances via the modal's own
// Back/Next/Create buttons, never by clicking a step directly, so nothing
// here is interactive. Narrower and centered (max-w-sm mx-auto) now that
// there are 4 steps instead of 2 — spanning the full modal width read as
// needlessly spread out once the label count doubled.
export function CourtFormStepIndicator({
  current,
}: CourtFormStepIndicatorProps) {
  return (
    <div className="mx-auto flex w-full max-w-sm items-center px-4 pb-4">
      {COURT_FORM_STEP_LABELS.map((label, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <div
            key={label}
            data-step={label}
            className="flex flex-1 items-center last:flex-none"
            aria-current={active ? "step" : undefined}
          >
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300 ease-out",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-card text-primary"
                      : "border-muted-foreground/20 bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300 ease-out",
                  active
                    ? "text-primary"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < COURT_FORM_STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "mx-2 mb-4 h-0.5 flex-1 rounded transition-colors duration-500 ease-out",
                  done ? "bg-primary" : "bg-muted-foreground/20",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

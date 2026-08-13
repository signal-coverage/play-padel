import { useEffect, useRef } from "react";
import { LayoutGrid } from "lucide-react";
import { Controller } from "react-hook-form";
import { OptionCard } from "@/app/onboarding/_components/OptionCard";
import { FieldError } from "@/components/ui/field";
import { COURT_RANGE_OPTIONS } from "@/app/onboarding/types";
import type { PlanStepProps } from "./types";

export function PlanStep({
  control,
  errors,
  shouldFocusHeading,
}: PlanStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (shouldFocusHeading) {
      headingRef.current?.focus();
    }
  }, [shouldFocusHeading]);

  return (
    <>
      <div>
        <h2
          ref={headingRef}
          className="text-base font-semibold mb-0.5"
          tabIndex={-1}
        >
          How big is your club?
        </h2>
        <p className="text-sm text-muted-foreground">
          This helps us set you up with the right plan.
        </p>
      </div>

      <Controller
        control={control}
        name="courtRange"
        render={({ field }) => (
          <div className="flex flex-col gap-3">
            {COURT_RANGE_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                icon={LayoutGrid}
                title={option.label}
                description={option.note}
                selected={field.value === option.value}
                onClick={() => field.onChange(option.value)}
              />
            ))}
          </div>
        )}
      />
      <FieldError errors={[errors.courtRange]} />
    </>
  );
}

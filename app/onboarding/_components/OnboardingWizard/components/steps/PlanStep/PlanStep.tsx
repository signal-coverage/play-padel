import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Controller } from "react-hook-form";
import { OptionCard } from "@/app/onboarding/_components/OptionCard";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils/utils";
import { COURT_RANGE_OPTIONS } from "@/app/onboarding/types";
import { PlanPricingCard } from "./components/PlanPricingCard";
import type { BillingCycle } from "./components/PlanPricingCard/types";
import type { PlanStepProps } from "./types";

const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

export function PlanStep({
  control,
  errors,
  shouldFocusHeading,
}: PlanStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  // The pricing card's height must exactly match the option-card column,
  // never drift with whichever plan is selected. CSS flex-grow alone isn't
  // reliable here — a flex item's own content still subtly influences how
  // the shared auto height gets computed even with flex-1 all the way down
  // (confirmed: the row measured a few px shorter specifically when MAX's
  // sparser content was shown). Measuring the left column directly and
  // applying it as an explicit height on the right column removes that
  // dependency entirely.
  const [rightColumnHeight, setRightColumnHeight] = useState<number>();
  // Preview-only toggle — not a form field. It only changes which price
  // PlanPricingCard shows; nothing about billing cycle is submitted with
  // onboarding today.
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    if (shouldFocusHeading) {
      headingRef.current?.focus();
    }
  }, [shouldFocusHeading]);

  useEffect(() => {
    const node = leftColumnRef.current;
    if (!node) return;

    // Only match heights in the two-column desktop layout — on mobile the
    // columns stack, and the right card should size to its own content.
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    function syncHeight() {
      setRightColumnHeight(mediaQuery.matches ? node!.offsetHeight : undefined);
    }

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    mediaQuery.addEventListener("change", syncHeight);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", syncHeight);
    };
  }, []);

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
          Pick a court range and we&apos;ll show you the matching plan.
        </p>
      </div>

      <Controller
        control={control}
        name="courtRange"
        render={({ field }) => {
          const selectedPlan = COURT_RANGE_OPTIONS.find(
            (option) => option.value === field.value,
          )?.plan;

          return (
            <div className="flex flex-col md:flex-row gap-6">
              <div
                ref={leftColumnRef}
                className="flex flex-col gap-3 md:flex-1"
              >
                <div className="flex items-center gap-2">
                  <div className="inline-flex w-fit rounded-full border border-border p-1">
                    {BILLING_CYCLE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setBillingCycle(option.value)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          billingCycle === option.value
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

                {COURT_RANGE_OPTIONS.map((option) => (
                  <OptionCard
                    key={option.value}
                    icon={LayoutGrid}
                    title={option.label}
                    description={option.note}
                    badge={option.plan === "PRO" ? "Most Popular" : undefined}
                    selected={field.value === option.value}
                    onClick={() => field.onChange(option.value)}
                  />
                ))}
              </div>
              <div
                className="flex flex-col md:flex-1"
                style={
                  rightColumnHeight !== undefined
                    ? { height: rightColumnHeight }
                    : undefined
                }
              >
                <PlanPricingCard
                  plan={selectedPlan}
                  billingCycle={billingCycle}
                />
              </div>
            </div>
          );
        }}
      />
      <FieldError errors={[errors.courtRange]} />
    </>
  );
}

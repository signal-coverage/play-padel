"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import { COURT_RANGE_OPTIONS } from "@/app/onboarding/types";
import { PLAN_DETAILS, PLAN_EMPHASIS, PLAN_ICONS } from "../../consts";
import {
  formatCurrency,
  getAnnualMonthlyEquivalent,
  getSavingsMonths,
} from "./utils";
import { flipVariants, flipTransition, hexagonClipPath } from "./styles";
import type { PlanPricingCardProps } from "./types";

export function PlanPricingCard({ plan, billingCycle }: PlanPricingCardProps) {
  const shouldReduce = useReducedMotion();
  // Before the owner picks a court range there's nothing to key the flip
  // off of — default to the first tier so the card always shows something
  // sensible instead of an empty state.
  const activePlan = plan ?? "BASIC";
  const details = PLAN_DETAILS[activePlan];
  const courtRangeLabel = COURT_RANGE_OPTIONS.find(
    (option) => option.plan === activePlan,
  )?.label;
  const hasFixedPrice =
    details.monthlyPrice !== null && details.annualPrice !== null;
  const Icon = PLAN_ICONS[activePlan];
  const emphasis = PLAN_EMPHASIS[activePlan];
  const isAnnual = billingCycle === "annual";
  const displayedMonthlyPrice = hasFixedPrice
    ? isAnnual
      ? getAnnualMonthlyEquivalent(details.annualPrice as number)
      : (details.monthlyPrice as number)
    : null;
  const savingsMonths = hasFixedPrice
    ? getSavingsMonths(
        details.monthlyPrice as number,
        details.annualPrice as number,
      )
    : 0;

  return (
    <div className="flex flex-1 flex-col" style={{ perspective: 1000 }}>
      <AnimatePresence mode="wait">
        <motion.div
          // Billing cycle flips the card too — only the price block's
          // content actually differs between the two, but re-using the
          // same whole-card flip keeps the motion language consistent
          // instead of introducing a second, smaller animation.
          key={`${activePlan}-${billingCycle}`}
          className="flex flex-1 flex-col"
          style={{ transformStyle: "preserve-3d" }}
          variants={shouldReduce ? undefined : flipVariants}
          initial={shouldReduce ? false : "enter"}
          animate="center"
          exit={shouldReduce ? undefined : "exit"}
          transition={shouldReduce ? { duration: 0 } : flipTransition}
        >
          <Card
            className={cn(
              "relative flex-1 overflow-hidden rounded-sm border py-6",
              emphasis.cardBorder,
              emphasis.cardShadow,
              emphasis.ring,
            )}
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 bg-linear-to-br",
                emphasis.wash,
              )}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 text-foreground opacity-[0.06]"
              style={{
                backgroundImage:
                  "radial-gradient(currentColor 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            />
            <CardContent className="relative flex flex-1 flex-col gap-4 px-6">
              {isAnnual && hasFixedPrice && (
                <span className="absolute top-6 right-6 inline-flex w-fit items-center rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Save {savingsMonths} months
                </span>
              )}

              <div
                className={cn(
                  "flex size-14 items-center justify-center bg-linear-to-br from-primary to-primary/70 text-primary-foreground",
                  emphasis.iconShadow,
                )}
                style={{ clipPath: hexagonClipPath }}
              >
                <Icon className="size-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-foreground">
                    {activePlan}
                  </p>
                  {activePlan === "PRO" && (
                    <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                      Most Popular
                    </span>
                  )}
                </div>
                {courtRangeLabel && (
                  <p className="text-xs text-muted-foreground">
                    {courtRangeLabel}
                  </p>
                )}
              </div>

              <div>
                {hasFixedPrice ? (
                  <>
                    <p className="text-4xl font-bold text-foreground">
                      {formatCurrency(displayedMonthlyPrice as number)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        / month
                      </span>
                    </p>
                    {isAnnual && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="line-through">
                          {formatCurrency(details.monthlyPrice as number)}
                        </span>{" "}
                        {formatCurrency(details.annualPrice as number)} billed
                        annually
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {details.priceNote}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {details.tagline}
                </p>
              </div>

              {details.welcomeFreeMonths != null && (
                <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {details.welcomeFreeMonths === 1
                    ? "1 month free to start"
                    : `${details.welcomeFreeMonths} months free to start`}
                </span>
              )}

              <div className="border-t border-border" />

              <ul className="flex flex-col gap-2.5">
                {details.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

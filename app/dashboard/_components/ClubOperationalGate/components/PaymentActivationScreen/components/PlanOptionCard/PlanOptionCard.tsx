"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import {
  formatCurrency,
  getAnnualMonthlyEquivalent,
  getSavingsMonths,
} from "@/lib/utils/planPricing";
import { PLAN_DETAILS, PLAN_EMPHASIS, PLAN_ICONS } from "./consts";
import {
  cardEntranceInitial,
  checkBadgeAnimate,
  checkBadgeInitial,
  getCardClassName,
  getCardMotionTransition,
  getIconBadgeClassName,
  getWashClassName,
  hexagonClipPath,
  priceCrossfadeExit,
  priceCrossfadeInitial,
  priceCrossfadeTransition,
  selectionSpringTransition,
} from "./styles";
import type { PlanOptionCardProps } from "./types";

// One selectable tile in PaymentActivationScreen's static 4-plan grid.
// Visual language mirrors PlanPricingCard (hexagon icon badge, the same
// PLAN_EMPHASIS-driven border/shadow/wash escalation, "Most Popular" badge
// on PRO, and the same annual-billing price treatment). Unlike that card
// there's no whole-card flip — switching billingCycle instead cross-fades
// just the price block in place (see the AnimatePresence below).
//
// Only the selected card gets the full PLAN_EMPHASIS-driven treatment
// (border/shadow/wash/icon color) — unselected cards render a muted,
// neutral version of that same chrome (see styles.ts) so the selected tile
// reads as the only "alive" one at a glance. The check-badge + ring pair is
// unchanged and remains the non-color cue for "selected"; the scale pop and
// badge animation below are purely additive motion on top of those cues.
//
// Implements the ARIA "radio" role rather than a plain toggle button: the
// parent renders a `role="radiogroup"` wrapping four of these, exactly one
// of which is ever selected. A native <button> is used as the element (free
// focus + Enter/Space activation) with role="radio" layered on top, per the
// accessibility guidance that a native interactive element is preferable to
// a `<div role="radio" tabIndex>` polyfill. The parent owns arrow-key
// navigation between cards (roving tabIndex below reflects its selection).
// `motion.button` keeps that same native element while adding the entrance
// stagger, selection scale-pop, and press feedback below.
//
// Motion notes:
// - The fade+slide entrance (`cardEntranceInitial` -> opacity/y in
//   `animate`) only plays once: it's driven by framer-motion's mount-time
//   `initial` prop, and this card only ever mounts once per plan (the
//   parent's `key={plan}` never changes). Later re-renders from
//   `billingCycle` or `isSelected` changing are just prop updates on the
//   same mounted instance, and since `opacity`/`y` already sit at their
//   `animate` target (1 / 0) by then, framer-motion has nothing left to
//   animate for those two properties — only `scale` (driven by
//   `isSelected`) moves again, via its own spring.
export function PlanOptionCard({
  plan,
  isSelected,
  billingCycle,
  onSelect,
  index,
  ref,
}: PlanOptionCardProps) {
  const shouldReduce = useReducedMotion();
  const details = PLAN_DETAILS[plan];
  const emphasis = PLAN_EMPHASIS[plan];
  const Icon = PLAN_ICONS[plan];
  const hasFixedPrice =
    details.monthlyPrice !== null && details.annualPrice !== null;
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
    <motion.button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onSelect(plan)}
      initial={shouldReduce ? false : cardEntranceInitial}
      animate={{ opacity: 1, y: 0, scale: isSelected ? 1.02 : 1 }}
      transition={
        shouldReduce ? { duration: 0 } : getCardMotionTransition(index)
      }
      whileTap={shouldReduce ? undefined : { scale: 0.96 }}
      className={cn(
        "flex flex-col rounded-sm text-left outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <Card className={getCardClassName(isSelected, emphasis)}>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0",
            getWashClassName(isSelected, emphasis),
          )}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 text-foreground opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />

        <AnimatePresence>
          {isSelected && (
            <motion.span
              key="check-badge"
              aria-hidden="true"
              initial={shouldReduce ? false : checkBadgeInitial}
              animate={checkBadgeAnimate}
              exit={shouldReduce ? undefined : checkBadgeInitial}
              transition={
                shouldReduce ? { duration: 0 } : selectionSpringTransition
              }
              className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Check className="size-3.5" />
            </motion.span>
          )}
        </AnimatePresence>

        <CardContent className="relative flex flex-1 flex-col gap-4 px-6">
          <AnimatePresence mode="wait">
            {isAnnual && hasFixedPrice && (
              <motion.span
                key="save-badge"
                initial={shouldReduce ? false : priceCrossfadeInitial}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduce ? undefined : priceCrossfadeExit}
                transition={
                  shouldReduce ? { duration: 0 } : priceCrossfadeTransition
                }
                className="absolute top-6 right-6 inline-flex w-fit items-center rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
              >
                Save {savingsMonths} months
              </motion.span>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "flex size-14 items-center justify-center",
              getIconBadgeClassName(isSelected, emphasis),
            )}
            style={{ clipPath: hexagonClipPath }}
          >
            <Icon aria-hidden="true" className="size-6" />
          </div>

          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-foreground">{plan}</p>
            {plan === "PRO" && (
              <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                Most Popular
              </span>
            )}
          </div>

          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={billingCycle}
                initial={shouldReduce ? false : priceCrossfadeInitial}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduce ? undefined : priceCrossfadeExit}
                transition={
                  shouldReduce ? { duration: 0 } : priceCrossfadeTransition
                }
              >
                {hasFixedPrice ? (
                  <>
                    <p className="text-3xl font-bold text-foreground">
                      {formatCurrency(displayedMonthlyPrice as number)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        / month
                      </span>
                    </p>
                    {isAnnual && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
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
              </motion.div>
            </AnimatePresence>
            <p className="mt-2 text-xs text-muted-foreground">
              {details.tagline}
            </p>
          </div>

          <div className="border-t border-border" />

          <ul className="flex flex-col gap-2.5">
            {details.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check aria-hidden="true" className="size-3" />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.button>
  );
}

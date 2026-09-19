import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PLAN_DETAILS,
  PLAN_EMPHASIS,
  PLAN_ICONS,
  ease,
  formatCurrency,
} from "../../consts";
import type { PricingCardProps } from "./types";

// One tier tile in LandingPricing's static pricing grid. PLAN_EMPHASIS
// drives visual escalation via borders + a color wash instead of a soft
// drop shadow — the "match line" motif applied to pricing rather than the
// reference template's rounded-2xl SaaS cards. The billingCycle prop picks
// monthlyPrice vs. annualPrice.
export function PricingCard({ plan, billingCycle }: PricingCardProps) {
  const t = useTranslations("LandingPricing");
  const tPlan = useTranslations("PlanPricingDetails");
  const details = PLAN_DETAILS[plan];
  const emphasis = PLAN_EMPHASIS[plan];
  const Icon = PLAN_ICONS[plan];
  const hasFixedPrice = details.monthlyPrice !== null;
  const price =
    billingCycle === "annual" ? details.annualPrice : details.monthlyPrice;
  const priceSuffix = billingCycle === "annual" ? t("perYear") : t("perMonth");
  const features = tPlan.raw(`${plan}.features`) as string[];
  // Derived from the real prices every render — never a hardcoded number —
  // so it can't go stale if monthlyPrice/annualPrice ever change.
  const annualSavingsPercent =
    hasFixedPrice && billingCycle === "annual"
      ? Math.round(
          (1 -
            (details.annualPrice as number) /
              ((details.monthlyPrice as number) * 12)) *
            100,
        )
      : null;

  return (
    <div className="relative h-full">
      <AnimatePresence>
        {annualSavingsPercent !== null && annualSavingsPercent > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: -10 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -10 }}
            transition={{ duration: 0.25, ease }}
            style={{
              clipPath: "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%)",
            }}
            className="absolute -top-3 -right-3 z-20 flex items-center gap-1 bg-accent py-1.5 pl-2.5 pr-4 text-xs font-bold text-accent-foreground shadow-md"
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-accent-foreground/30"
            />
            {t("annualSavings", { percent: annualSavingsPercent })}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`relative flex h-full flex-col gap-4 overflow-hidden rounded-sm border bg-background p-6 ${emphasis.cardBorder} ${emphasis.ring ?? ""}`}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-linear-to-br ${emphasis.wash}`}
        />

        <div className="relative flex flex-col gap-4">
          <div
            className={`flex size-12 items-center justify-center rounded-sm bg-linear-to-br from-primary to-primary/70 text-primary-foreground`}
          >
            <Icon aria-hidden="true" className="size-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{plan}</h3>
              {details.welcomeFreeMonths !== null && (
                <span className="inline-flex items-center rounded-sm bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  {t("welcomeFreeMonths", { count: details.welcomeFreeMonths })}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tPlan(`${plan}.tagline`)}
            </p>
          </div>

          <div className="overflow-hidden">
            {hasFixedPrice ? (
              <p className="text-3xl font-bold text-foreground">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={billingCycle}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease }}
                    className="inline-block"
                  >
                    {formatCurrency(price as number)}
                  </motion.span>
                </AnimatePresence>{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {priceSuffix}
                </span>
              </p>
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {tPlan(`${plan}.priceNote`)}
              </p>
            )}
          </div>

          <div className="border-t border-dashed border-border" />

          <ul className="flex flex-col gap-2.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check aria-hidden="true" className="size-3" />
                </span>
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

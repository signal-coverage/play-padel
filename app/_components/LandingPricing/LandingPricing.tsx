"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CONTAINER } from "@/lib/consts";
import { Switch } from "@/components/ui/switch";
import { PricingCard } from "./components/PricingCard";
import { PLAN_ORDER, ease } from "./consts";
import type { BillingCycle } from "./types";

// A monthly/annual toggle (existing shadcn Switch) above the PLAN_ORDER
// grid, driving each PricingCard's displayed price from
// PLAN_DETAILS[plan].monthlyPrice/.annualPrice.
export function LandingPricing() {
  const t = useTranslations("LandingPricing");
  const shouldReduce = useReducedMotion();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const isAnnual = billingCycle === "annual";

  return (
    <section id="pricing" className={`${CONTAINER} py-12`}>
      <motion.div
        className="flex flex-col items-center text-center gap-3"
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
      >
        <h2 className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
          {t("heading")}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {t("subheading")}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <span
            className={`text-sm font-medium ${isAnnual ? "text-muted-foreground" : "text-foreground"}`}
          >
            {t("monthly")}
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={(checked) =>
              setBillingCycle(checked ? "annual" : "monthly")
            }
            aria-label={t("billingCycleLabel")}
          />
          <span
            className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            {t("annual")}
          </span>
        </div>
      </motion.div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((plan, i) => (
          <motion.div
            key={plan}
            className="grid"
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease }}
          >
            <PricingCard plan={plan} billingCycle={billingCycle} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

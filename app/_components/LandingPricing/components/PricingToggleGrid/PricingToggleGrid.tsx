"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { FadeInSection } from "@/components/FadeInSection";
import { PricingCard } from "../PricingCard";
import { PLAN_ORDER } from "../../consts";
import type { BillingCycle } from "../../types";

// The monthly/annual toggle and the plan grid share one piece of state
// (billingCycle), so both live in this single client island — everything
// else in LandingPricing (heading/subheading) renders on the server.
export function PricingToggleGrid() {
  const t = useTranslations("LandingPricing");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const isAnnual = billingCycle === "annual";

  return (
    <>
      <FadeInSection
        className="mt-4 flex items-center justify-center gap-3"
        delayMs={80}
      >
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
      </FadeInSection>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((plan, i) => (
          <FadeInSection key={plan} className="grid" delayMs={100 + i * 80}>
            <PricingCard plan={plan} billingCycle={billingCycle} />
          </FadeInSection>
        ))}
      </div>
    </>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CONTAINER } from "@/lib/consts";
import { PricingCard } from "./components/PricingCard";
import { PLAN_ORDER, ease } from "./consts";

export function LandingPricing() {
  const t = useTranslations("LandingPricing");
  const shouldReduce = useReducedMotion();

  return (
    <section id="pricing" className={`${CONTAINER} py-12`}>
      <motion.div
        className="flex flex-col items-center text-center gap-3"
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
      >
        <h2 className="text-3xl md:text-[34px] font-bold leading-tight tracking-tight text-foreground">
          {t("heading")}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {t("subheading")}
        </p>
      </motion.div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((plan, i) => (
          <motion.div
            key={plan}
            // grid (not the framer-motion default block div), with no
            // template of its own — same reason as the CSS Grid default on
            // the outer grid two levels up: a single grid-item child
            // stretches to fill BOTH axes of its container automatically,
            // matching how PricingCard behaved when it was itself the
            // direct grid item (before this wrapper existed for the
            // stagger animation below). A plain block/flex child would only
            // stretch height, not width, and would need extra width
            // classes on PricingCard itself to compensate — grid needs
            // none.
            className="grid"
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease }}
          >
            <PricingCard plan={plan} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

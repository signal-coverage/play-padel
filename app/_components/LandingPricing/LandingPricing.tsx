"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CONTAINER } from "@/lib/consts";
import { PricingCard } from "./components/PricingCard";
import {
  PLAN_ORDER,
  SECTION_HEADING,
  SECTION_SUBHEADING,
  ease,
} from "./consts";

export function LandingPricing() {
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
          {SECTION_HEADING}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {SECTION_SUBHEADING}
        </p>
      </motion.div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((plan) => (
          <PricingCard key={plan} plan={plan} />
        ))}
      </div>
    </section>
  );
}

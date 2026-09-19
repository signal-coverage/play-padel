"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FEATURE_ICONS, ease } from "./consts";
import type { FeatureTranslation } from "./types";
import { CONTAINER } from "@/lib/consts";

// Three columns inside one bordered container separated by thin dividers —
// the "match line" motif — each column a plain icon + title + one-line
// description with no photography.
export function LandingFeatures() {
  const t = useTranslations("LandingFeatures");
  const shouldReduce = useReducedMotion();
  const items = t.raw("items") as FeatureTranslation[];

  return (
    <section id="features" className={`${CONTAINER} py-12`}>
      <motion.h2
        className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground max-w-xl mb-10"
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
      >
        {t("heading")}
      </motion.h2>

      <motion.div
        className="grid sm:grid-cols-3 rounded-sm border border-border divide-y sm:divide-y-0 sm:divide-x divide-border"
        initial={shouldReduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
      >
        {items.map((item, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <div key={item.title} className="flex flex-col gap-4 p-8">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <h3 className="text-[17px] font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                {item.description}
              </p>
            </div>
          );
        })}
      </motion.div>
    </section>
  );
}

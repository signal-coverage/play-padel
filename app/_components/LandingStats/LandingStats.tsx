"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ease } from "@/lib/consts/animation";
import type { Stat } from "./types";
import { CONTAINER } from "@/lib/consts";

// Replaces the template's client-logo wall (play-padel has no client logos
// to show) with a row of stat data, styled as a single horizontal row
// divided by thin vertical rules — the "match line" motif applied
// sideways.
export function LandingStats() {
  const t = useTranslations("LandingStats");
  const shouldReduce = useReducedMotion();
  const stats = t.raw("items") as Stat[];

  return (
    <section className="py-16 border-y border-border">
      <div className={CONTAINER}>
        <motion.p
          className="text-center text-sm font-medium text-muted-foreground mb-10"
          initial={shouldReduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          {t("heading")}
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row sm:divide-x sm:divide-border"
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.08, ease }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex-1 flex flex-col items-center text-center gap-1 py-4 sm:py-0"
            >
              <span className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

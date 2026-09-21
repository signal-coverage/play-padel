import { getTranslations } from "next-intl/server";
import { FadeInSection } from "@/components/FadeInSection";
import type { Stat } from "./types";
import { CONTAINER } from "@/lib/consts";

// Replaces the template's client-logo wall (play-padel has no client logos
// to show) with a row of stat data, styled as a single horizontal row
// divided by thin vertical rules — the "match line" motif applied
// sideways. Pure copy + no real interactivity, so this renders fully on
// the server; the scroll-in fade is FadeInSection (IntersectionObserver),
// not framer-motion.
export async function LandingStats() {
  const t = await getTranslations("LandingStats");
  const stats = t.raw("items") as Stat[];

  return (
    <section className="py-16 border-y border-border">
      <div className={CONTAINER}>
        <FadeInSection
          as="p"
          className="text-center text-sm font-medium text-muted-foreground mb-10"
        >
          {t("heading")}
        </FadeInSection>

        <FadeInSection
          className="flex flex-col sm:flex-row sm:divide-x sm:divide-border"
          delayMs={80}
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
        </FadeInSection>
      </div>
    </section>
  );
}

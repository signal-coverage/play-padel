import { getTranslations } from "next-intl/server";
import { FadeInSection } from "@/components/FadeInSection";
import { FEATURE_ICONS } from "./consts";
import type { FeatureTranslation } from "./types";
import { CONTAINER } from "@/lib/consts";

// Three columns inside one bordered container separated by thin dividers —
// the "match line" motif — each column a plain icon + title + one-line
// description with no photography. No real interactivity, so this is a
// pure Server Component; FadeInSection (not framer-motion) drives the
// scroll-in fade.
export async function LandingFeatures() {
  const t = await getTranslations("LandingFeatures");
  const items = t.raw("items") as FeatureTranslation[];

  return (
    <section id="features" className={`${CONTAINER} py-12`}>
      <FadeInSection
        as="h2"
        className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground max-w-xl mb-10"
      >
        {t("heading")}
      </FadeInSection>

      <FadeInSection
        className="grid sm:grid-cols-3 rounded-sm border border-border divide-y sm:divide-y-0 sm:divide-x divide-border"
        delayMs={80}
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
      </FadeInSection>
    </section>
  );
}

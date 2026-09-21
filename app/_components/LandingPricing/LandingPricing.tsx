import { getTranslations } from "next-intl/server";
import { FadeInSection } from "@/components/FadeInSection";
import { CONTAINER } from "@/lib/consts";
import { PricingToggleGrid } from "./components/PricingToggleGrid";

// A monthly/annual toggle (existing shadcn Switch) above the PLAN_ORDER
// grid, driving each PricingCard's displayed price from
// PLAN_DETAILS[plan].monthlyPrice/.annualPrice. The toggle and the grid
// share state, so both live in the PricingToggleGrid client island —
// this section itself only renders the static heading on the server.
export async function LandingPricing() {
  const t = await getTranslations("LandingPricing");

  return (
    <section id="pricing" className={`${CONTAINER} py-12`}>
      <FadeInSection className="flex flex-col items-center text-center gap-3">
        <h2 className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
          {t("heading")}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {t("subheading")}
        </p>
      </FadeInSection>

      <PricingToggleGrid />
    </section>
  );
}

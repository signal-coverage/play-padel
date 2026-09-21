import { getTranslations } from "next-intl/server";
import { CHIP_ICONS } from "./consts";
import { PhotoCarousel } from "./components/PhotoCarousel";
import type { ChipTranslation } from "./types";
import { FadeInSection } from "@/components/FadeInSection";
import { CONTAINER } from "@/lib/consts";

// An asymmetric two-column layout (photo carousel on one side, heading +
// paragraph + a row of feature-icon chips on the other), matching the
// template's "resource allocation" section shape. The carousel stays inside
// the same aspect-4/3 frame the old single photo used — prev/next arrows and
// dot indicators overlay the photo itself rather than pushing the section
// taller, so this section's footprint never changes as photos are added.
// Only the carousel needs a client runtime (Embla) — see
// components/PhotoCarousel; the copy/heading half renders on the server.
export async function LandingAbout() {
  const t = await getTranslations("LandingAbout");
  const chips = t.raw("chips") as ChipTranslation[];
  const imageAlts = t.raw("imageAlts") as string[];

  return (
    <section id="about" className={`${CONTAINER} py-12`}>
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <FadeInSection className="order-2 md:order-1">
          <PhotoCarousel imageAlts={imageAlts} />
        </FadeInSection>

        <FadeInSection className="order-1 md:order-2" delayMs={80}>
          <h2 className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
            {t("heading")}
          </h2>
          <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed max-w-md text-pretty">
            {t("description")}
          </p>

          <div className="mt-8 border-t border-dashed border-border pt-6 flex flex-wrap gap-3">
            {chips.map((chip, i) => {
              const Icon = CHIP_ICONS[i];
              return (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted px-3.5 py-2 text-sm font-medium text-foreground"
                >
                  <Icon aria-hidden="true" className="size-4 text-primary" />
                  {chip.label}
                </span>
              );
            })}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

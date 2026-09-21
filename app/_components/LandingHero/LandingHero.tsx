import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { backgroundImage } from "./consts";
import { HeroCollage } from "./components/HeroCollage";
import { CONTAINER } from "@/lib/consts";
import { ScrollLink } from "@/components/ScrollLink";

// A centered layout — headline, subhead, and CTAs stacked and centered —
// followed by a floating card collage instead of a hero photo + bullet
// list. The collage's central card is a static mockup of the app's
// real-time court-availability view (the product's core value prop),
// surrounded by four smaller cards grounded in real product/business
// content. No word in the headline is accent-colored (see AGENTS.md's
// generic-AI-tell note) — the lime accent still lives entirely on the
// primary CTA button fill. Below `md:` the collage collapses from absolute
// corner-positioning into a simple stacked arrangement (central card, then
// a 2-column grid of the four small cards).
//
// This is above-the-fold, LCP-critical content, so it renders on the
// server with no entrance-fade delay; only the collage's continuous
// animation + tooltips (components/HeroCollage) need a client runtime.
//
// `sizes="100vw"` on the background image is intentional, not an oversight:
// this layer sits outside the `CONTAINER` max-width wrapper (it's a sibling
// `absolute inset-0` div spanning the whole `<section>`, which itself has
// no max-width), so it genuinely renders at the full viewport width at
// every breakpoint — narrowing `sizes` here would just make next/image pick
// a source too small for wide viewports.
export async function LandingHero() {
  const t = await getTranslations("LandingHero");

  return (
    <section className="relative isolate overflow-hidden pt-32 pb-24 md:pt-44 md:pb-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 overflow-hidden"
      >
        {/* Uniform blur across the whole photo — same amount everywhere,
            no gradient/mask. */}
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-110 object-cover object-bottom blur-[3px]"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-background/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,color-mix(in_oklch,var(--secondary)_16%,transparent),transparent),radial-gradient(ellipse_45%_35%_at_85%_20%,color-mix(in_oklch,var(--accent)_12%,transparent),transparent)]"
      />
      {/* Soft white spotlight behind the headline/subhead only, so that
          text stays legible over the busy court photo without covering
          the photo lower down (behind the mockup/floating cards). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-5 h-120 bg-[radial-gradient(ellipse_65%_60%_at_50%_15%,color-mix(in_oklch,var(--background)_85%,transparent),transparent)]"
      />

      <div className={CONTAINER}>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground [text-shadow:0_0_2px_var(--background),0_0_10px_var(--background),0_0_24px_var(--background)]">
            {t("heading.line1")}
            <br />
            {t("heading.line2")}
          </h1>

          <p className="mx-auto mt-4 max-w-105 text-[15px] leading-[1.7] font-semibold text-white [text-shadow:0_0_2px_color-mix(in_oklch,var(--primary)_85%,transparent),0_0_8px_color-mix(in_oklch,var(--primary)_70%,transparent),0_0_18px_color-mix(in_oklch,var(--primary)_50%,transparent)]">
            {t("description")}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-sm px-5 py-3 text-sm font-semibold border border-transparent hover:border-foreground/20 transition-colors duration-200"
            >
              {t("ctaPrimary")}
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <ScrollLink
              href="#features"
              className="inline-flex items-center gap-2 border border-foreground/15 bg-background text-foreground rounded-sm px-5 py-3 text-sm font-semibold shadow-md hover:bg-foreground hover:text-background hover:border-foreground transition-colors duration-200"
            >
              {t("ctaSecondary")}
              <ArrowUpRight size={14} strokeWidth={2.5} />
            </ScrollLink>
          </div>

          <p className="mt-4 text-xs text-white/90 [text-shadow:0_0_2px_color-mix(in_oklch,var(--primary)_85%,transparent),0_0_6px_color-mix(in_oklch,var(--primary)_65%,transparent)]">
            {t("reassurance")}
          </p>
        </div>

        <HeroCollage />
      </div>
    </section>
  );
}

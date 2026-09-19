"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  backgroundImage,
  ease,
  FLOATING_CARD_ICONS,
  FLOATING_CARD_KEYS,
  FLOATING_CARD_POSITIONS,
  MOCKUP_SLOTS,
} from "./consts";
import { CONTAINER } from "@/lib/consts";
import { scrollToSection } from "@/lib/utils/scroll-to-section";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
export function LandingHero() {
  const t = useTranslations("LandingHero");
  const shouldReduce = useReducedMotion();

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
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
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
            <Link
              href="#features"
              onClick={(e) => scrollToSection(e, "#features")}
              className="inline-flex items-center gap-2 border border-foreground/15 bg-background text-foreground rounded-sm px-5 py-3 text-sm font-semibold shadow-md hover:bg-foreground hover:text-background hover:border-foreground transition-colors duration-200"
            >
              {t("ctaSecondary")}
              <ArrowUpRight size={14} strokeWidth={2.5} />
            </Link>
          </div>

          <p className="mt-4 text-xs text-white/90 [text-shadow:0_0_2px_color-mix(in_oklch,var(--primary)_85%,transparent),0_0_6px_color-mix(in_oklch,var(--primary)_65%,transparent)]">
            {t("reassurance")}
          </p>
        </motion.div>

        <div className="relative mx-auto mt-10 max-w-xs md:mt-14 md:max-w-2xl md:pb-6">
          <motion.div
            className="relative z-10 mx-auto max-w-xs overflow-hidden rounded-2xl border border-border bg-white shadow-card md:max-w-sm"
            initial={shouldReduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: shouldReduce ? 0 : [0, -5, 0], scale: 1 }}
            transition={{
              opacity: { duration: 0.6, delay: 0.1, ease },
              scale: { duration: 0.6, delay: 0.1, ease },
              y: shouldReduce
                ? { duration: 0.6, delay: 0.1, ease }
                : {
                    duration: 2.6,
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut",
                    delay: 0.2,
                  },
            }}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-secondary" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                {t("mockup.courtName")}
              </span>
              <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                {t("mockup.liveLabel")}
              </span>
            </div>

            <ul className="divide-y divide-border">
              {MOCKUP_SLOTS.map((slot, i) => (
                <li
                  key={`${slot.time}-${i}`}
                  className="flex items-center justify-between px-4 py-2"
                >
                  <span className="text-[13px] text-foreground">
                    {slot.time}
                  </span>
                  {slot.status === "available" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      <Check aria-hidden="true" className="size-2.5" />
                      {t("mockup.statusAvailable")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {t("mockup.statusBooked")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 md:contents">
            {FLOATING_CARD_KEYS.map((key, i) => {
              const Icon = FLOATING_CARD_ICONS[key];
              const subtitle = t(`floatingCards.${key}.subtitle`);
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className={`flex cursor-pointer gap-2 rounded-2xl border border-border bg-white p-2.5 px-3 shadow-card md:absolute md:w-42 ${subtitle ? "items-start" : "items-center"} ${FLOATING_CARD_POSITIONS[i]}`}
                      initial={
                        shouldReduce
                          ? false
                          : { opacity: 0, y: 16, scale: 0.95 }
                      }
                      animate={{
                        opacity: 1,
                        y: shouldReduce ? 0 : [0, -7, 0],
                        scale: 1,
                      }}
                      whileHover={{
                        scale: 1.08,
                        y: -4,
                        transition: { duration: 0.2, ease: "easeOut" },
                      }}
                      transition={{
                        opacity: {
                          duration: 0.5,
                          delay: shouldReduce ? 0 : 0.35 + i * 0.1,
                          ease,
                        },
                        scale: {
                          duration: 0.5,
                          delay: shouldReduce ? 0 : 0.35 + i * 0.1,
                          ease,
                        },
                        y: shouldReduce
                          ? { duration: 0.5, delay: 0, ease }
                          : {
                              duration: 1.8 + i * 0.4,
                              repeat: Infinity,
                              repeatType: "loop",
                              ease: "easeInOut",
                              delay: 0.35 + i * 0.1,
                            },
                      }}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon aria-hidden="true" className="size-3.5" />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">
                          {t(`floatingCards.${key}.title`)}
                        </span>
                        {subtitle && (
                          <span className="text-[11px] text-muted-foreground">
                            {subtitle}
                          </span>
                        )}
                      </span>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56 text-center">
                    {t(`floatingCards.${key}.description`)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

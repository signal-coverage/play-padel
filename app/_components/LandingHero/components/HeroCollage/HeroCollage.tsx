"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ease,
  FLOATING_CARD_ICONS,
  FLOATING_CARD_KEYS,
  FLOATING_CARD_POSITIONS,
  MOCKUP_SLOTS,
} from "../../consts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// The only genuinely animated/interactive piece of the hero: a continuous
// looping bob, hover scale, and Radix tooltips — real ongoing behavior,
// not a one-shot scroll-in fade, so it keeps framer-motion and stays its
// own client island instead of using FadeInSection. Everything else in
// LandingHero (heading, CTAs, background) is static and renders on the
// server.
export function HeroCollage() {
  const t = useTranslations("LandingHero");
  const shouldReduce = useReducedMotion();

  return (
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
              <span className="text-[13px] text-foreground">{slot.time}</span>
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
                    shouldReduce ? false : { opacity: 0, y: 16, scale: 0.95 }
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
  );
}

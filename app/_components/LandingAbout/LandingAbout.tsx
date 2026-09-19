"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ABOUT_IMAGES, CHIP_ICONS, ease } from "./consts";
import { CarouselDots } from "./components/CarouselDots";
import type { ChipTranslation } from "./types";
import { CONTAINER } from "@/lib/consts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// An asymmetric two-column layout (photo carousel on one side, heading +
// paragraph + a row of feature-icon chips on the other), matching the
// template's "resource allocation" section shape. The carousel stays inside
// the same aspect-4/3 frame the old single photo used — prev/next arrows and
// dot indicators overlay the photo itself rather than pushing the section
// taller, so this section's footprint never changes as photos are added.
export function LandingAbout() {
  const t = useTranslations("LandingAbout");
  const shouldReduce = useReducedMotion();
  const chips = t.raw("chips") as ChipTranslation[];
  const imageAlts = t.raw("imageAlts") as string[];

  return (
    <section id="about" className={`${CONTAINER} py-12`}>
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <motion.div
          className="order-2 md:order-1"
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <Carousel opts={{ loop: true }}>
            <CarouselContent className="ml-0">
              {ABOUT_IMAGES.map((image, i) => (
                <CarouselItem key={imageAlts[i]} className="pl-0">
                  <div className="relative rounded-sm overflow-hidden aspect-4/3">
                    <Image
                      src={image}
                      alt={imageAlts[i]}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                      priority={i === 0}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-3 border-none bg-background/80 text-foreground opacity-80 backdrop-blur-sm hover:bg-background hover:opacity-100" />
            <CarouselNext className="right-3 border-none bg-background/80 text-foreground opacity-80 backdrop-blur-sm hover:bg-background hover:opacity-100" />
            <CarouselDots />
          </Carousel>
        </motion.div>

        <motion.div
          className="order-1 md:order-2"
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.08, ease }}
        >
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
        </motion.div>
      </div>
    </section>
  );
}

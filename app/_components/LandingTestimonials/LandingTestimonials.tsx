"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ease } from "./consts";
import type { Testimonial } from "./types";
import { getInitials } from "./utils";
import { CONTAINER } from "@/lib/consts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// A horizontally scrolling carousel of fictional-club testimonials. Copy is
// placeholder, written to sound like specific booking/payments/scheduling
// praise rather than generic SaaS enthusiasm (see messages/*.json's
// LandingTestimonials namespace, marked as placeholder there for the user
// to refine).
export function LandingTestimonials() {
  const t = useTranslations("LandingTestimonials");
  const shouldReduce = useReducedMotion();
  const testimonials = t.raw("items") as Testimonial[];

  return (
    <section id="testimonials" className={`${CONTAINER} py-12`}>
      <motion.div
        className="flex flex-col items-center text-center gap-3 mb-10"
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
      >
        <h2 className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
          {t("heading")}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {t("subheading")}
        </p>
      </motion.div>

      <Carousel opts={{ align: "start", loop: true }} className="mx-auto">
        <CarouselContent>
          {testimonials.map((testimonial) => (
            <CarouselItem
              key={testimonial.name}
              className="sm:basis-1/2 lg:basis-1/3"
            >
              <div className="flex h-full flex-col gap-6 rounded-sm border border-border p-7">
                <p className="text-[15px] text-foreground leading-relaxed text-pretty">
                  “{testimonial.quote}”
                </p>
                <div className="mt-auto flex items-center gap-3 border-t border-dashed border-border pt-4">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  >
                    {getInitials(testimonial.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-6 flex items-center justify-center gap-3">
          <CarouselPrevious className="static" />
          <CarouselNext className="static" />
        </div>
      </Carousel>
    </section>
  );
}

"use client";
import { getInitials } from "../../utils";
import type { TestimonialsCarouselProps } from "./types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Embla (components/ui/carousel.tsx) measures DOM geometry synchronously
// on mount and needs its own client runtime — isolated here so the rest of
// LandingTestimonials (heading, subheading) can render on the server.
export function TestimonialsCarousel({
  testimonials,
}: TestimonialsCarouselProps) {
  return (
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
  );
}

import { getTranslations } from "next-intl/server";
import { TestimonialsCarousel } from "./components/TestimonialsCarousel";
import type { Testimonial } from "./types";
import { FadeInSection } from "@/components/FadeInSection";
import { CONTAINER } from "@/lib/consts";

// A horizontally scrolling carousel of fictional-club testimonials. Copy is
// placeholder, written to sound like specific booking/payments/scheduling
// praise rather than generic SaaS enthusiasm (see messages/*.json's
// LandingTestimonials namespace, marked as placeholder there for the user
// to refine). Only the carousel needs a client runtime (Embla) — see
// components/TestimonialsCarousel; the heading renders on the server.
export async function LandingTestimonials() {
  const t = await getTranslations("LandingTestimonials");
  const testimonials = t.raw("items") as Testimonial[];

  return (
    <section id="testimonials" className={`${CONTAINER} py-12`}>
      <FadeInSection className="flex flex-col items-center text-center gap-3 mb-10">
        <h2 className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
          {t("heading")}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {t("subheading")}
        </p>
      </FadeInSection>

      <TestimonialsCarousel testimonials={testimonials} />
    </section>
  );
}

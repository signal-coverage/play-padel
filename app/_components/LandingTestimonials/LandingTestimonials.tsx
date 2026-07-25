"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { testimonials, ease } from "./consts";
import { AvatarTab } from "./components/AvatarTab/AvatarTab";
import { CONTAINER } from "@/lib/consts";

export function LandingTestimonials() {
  const shouldReduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const total = testimonials.length;
  const current = testimonials[index];

  const goTo = (i: number) => setIndex(((i % total) + total) % total);
  const goPrev = () => goTo(index - 1);
  const goNext = () => goTo(index + 1);

  return (
    <section className={`${CONTAINER} py-14`}>
      <motion.div
        className="flex items-start justify-between gap-6 mb-16"
        initial={shouldReduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease }}
      >
        <h2 className="text-2xl md:text-[28px] font-semibold leading-snug">
          <span className="text-[#111111]">Real Stories from the People</span>
          <br />
          <span className="text-[#A3A3A3]">Who Play Here Every Week</span>
        </h2>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous testimonial"
            className="w-11 h-11 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next testimonial"
            className="w-11 h-11 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
          >
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </motion.div>

      <div className="max-w-[860px] mx-auto text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.name}
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease }}
          >
            <p className="text-2xl md:text-[32px] leading-snug tracking-tight min-h-33 md:min-h-44 line-clamp-4">
              <span className="text-[#111111] font-semibold">
                {current.quoteLead}
              </span>{" "}
              <span className="text-[#A3A3A3] font-medium">
                {current.quoteRest}
              </span>
            </p>

            <p className="mt-8 text-sm text-[#999999]">
              <span className="font-semibold text-[#111111]">
                {current.name},
              </span>{" "}
              {current.role}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center mt-8">
          {testimonials.map((t, i) => (
            <AvatarTab
              key={t.name}
              testimonial={t}
              isActive={i === index}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

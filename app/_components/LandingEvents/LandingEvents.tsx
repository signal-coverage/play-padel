"use client";
import { motion, useReducedMotion } from "framer-motion";
import { ease } from "./consts";
import { CONTAINER } from "@/lib/consts";
import { EventShowcase } from "./components/EventShowcase";

export function LandingEvents() {
  const shouldReduce = useReducedMotion();

  return (
    <section id="modules" className={`${CONTAINER} py-12`}>
      <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
        <motion.h2
          className="text-3xl md:text-[34px] font-bold leading-tight tracking-tight max-w-2xl"
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="text-[#A3A3A3]">
            Rally, Learn, and Celebrate with{" "}
          </span>
          <span className="text-[#111111]">Our Paddle Community Events</span>
        </motion.h2>
        <span className="shrink-0 inline-flex items-center bg-[#111111] text-white rounded-full px-4 py-2 text-[13px] font-semibold">
          Play Together, Grow Together
        </span>
      </div>

      <EventShowcase />

      <p className="mt-10 text-sm text-[#737373] leading-relaxed text-center">
        Join paddle events.
        <br />
        Play more, connect better.
      </p>
    </section>
  );
}

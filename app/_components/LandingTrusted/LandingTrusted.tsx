"use client";
import { motion, useReducedMotion } from "framer-motion";
import { STATS, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";

export function LandingTrusted() {
  const shouldReduce = useReducedMotion();

  return (
    <section className="py-28 bg-white">
      <div
        className={`${CONTAINER} flex flex-col md:flex-row gap-10 md:gap-16`}
      >
        <motion.div
          className="shrink-0"
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="inline-flex items-center bg-[#111111] text-white rounded-full px-4 py-2 text-[13px] font-semibold">
            Beyond the Court
          </span>
        </motion.div>

        <div className="flex-1">
          <motion.h2
            className="text-2xl md:text-[28px] leading-snug text-[#111111] max-w-2xl"
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.06, ease }}
          >
            <span className="font-bold">
              Whether you&apos;re here for the thrill, the fitness, or the
              friends
            </span>{" "}
            — Play Padel brings paddle lovers together in a space that&apos;s
            fun, inclusive, and energizing.
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-8 sm:gap-y-10 mt-10 sm:mt-12">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.12 + i * 0.08, ease }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1 text-[15px] font-semibold text-[#111111]">
                  {stat.label}
                </div>
                <p className="mt-2 text-sm text-[#999999] leading-relaxed max-w-none sm:max-w-60">
                  {stat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

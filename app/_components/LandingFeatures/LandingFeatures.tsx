"use client";
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { FACILITIES, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";

export function LandingFeatures() {
  const shouldReduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const total = FACILITIES.length;
  const current = FACILITIES[index];
  const next = FACILITIES[(index + 1) % total];

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <section id="features" className={`${CONTAINER} py-12`}>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="flex flex-col gap-6">
          <motion.span
            className="self-start inline-flex items-center bg-[#111111] text-white rounded-full px-4 py-2 text-[13px] font-semibold"
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            Built for Paddle. Built for You.
          </motion.span>

          <div className="relative rounded-[28px] overflow-hidden flex-1 min-h-90">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.title}
                className="absolute inset-0"
                initial={shouldReduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease }}
              >
                <Image
                  src={current.image}
                  alt={current.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-10 pt-0 pb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous facility"
                className="w-11 h-11 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next facility"
                className="w-11 h-11 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
              >
                <ArrowRight size={16} strokeWidth={2} />
              </button>
            </div>
            <motion.h2
              className="text-3xl md:text-[34px] font-bold leading-tight tracking-tight"
              initial={shouldReduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease, delay: 0.05 }}
            >
              <span className="text-[#111111]">World-Class Paddle Facilities</span>
              <br />
              <span className="text-[#111111]">for </span>
              <span className="text-[#A3A3A3]">Every Level of Play</span>
            </motion.h2>
          </div>

          <div className="flex items-end justify-between gap-8">
            <div className="max-w-70">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.title}
                  initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease }}
                >
                  <h3 className="text-[17px] font-semibold text-[#111111] mb-2">
                    {current.title}
                  </h3>
                  <p className="text-sm text-[#737373] leading-relaxed">
                    {current.description}
                  </p>
                  <div className="mt-4 text-sm text-[#999999] tabular-nums">
                    {String(index + 1).padStart(1, "0")} / {total}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={goNext}
              className="group relative shrink-0 w-40 h-32 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-500 active:scale-95"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={next.title}
                  className="absolute inset-0"
                  initial={shouldReduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                >
                  <Image
                    src={next.image}
                    alt={next.title}
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
                  />
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-3 max-w-[calc(100%-1.5rem)] inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[#111111] rounded-full px-3 py-1.5 text-xs font-semibold">
                    <span className="truncate min-w-0">{next.title}</span>
                    <ArrowUpRight size={13} strokeWidth={2.5} className="shrink-0" />
                  </span>
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { SlideCounter } from "@/app/_components/SlideCounter";
import { PLATFORM_FEATURES, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";

export function LandingFeatures() {
  const shouldReduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const total = PLATFORM_FEATURES.length;
  const current = PLATFORM_FEATURES[index];
  const next = PLATFORM_FEATURES[(index + 1) % total];

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <section id="features" className={`${CONTAINER} py-12`}>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="flex flex-col gap-6">
          <motion.span
            className="self-start inline-flex items-center bg-foreground text-white rounded-full px-4 py-2 text-[13px] font-semibold"
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            One Platform. Every Court.
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
                  alt={current.imageAlt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
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
                aria-label="Previous feature"
                className="w-11 h-11 rounded-full border border-border text-foreground flex items-center justify-center hover:border-foreground transition-colors"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next feature"
                className="w-11 h-11 rounded-full border border-border text-foreground flex items-center justify-center hover:border-foreground transition-colors"
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
              <span className="text-foreground">Everything You Need</span>
              <br />
              <span className="text-muted-foreground">to Book and Manage</span>
            </motion.h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 sm:gap-8">
            <div className="max-w-full sm:max-w-70">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.title}
                  initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease }}
                >
                  <h3 className="text-[17px] font-semibold text-foreground mb-2">
                    {current.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                    {current.description}
                  </p>
                  <div className="mt-4">
                    <SlideCounter current={index + 1} total={total} />
                    <div className="mt-3 flex items-center gap-1.5">
                      {PLATFORM_FEATURES.map((feature, i) => (
                        <button
                          key={feature.title}
                          type="button"
                          onClick={() => setIndex(i)}
                          aria-label={`Go to feature ${i + 1}: ${feature.title}`}
                          aria-current={i === index}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            i === index
                              ? "w-5 bg-accent"
                              : "w-2 bg-border hover:bg-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={goNext}
              className="group relative shrink-0 w-40 h-32 rounded-sm overflow-hidden hover:shadow-xl transition-shadow duration-500 active:scale-95"
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
                    alt={next.imageAlt}
                    fill
                    sizes="160px"
                    className="object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 transition-transform duration-500 ease-out group-hover:scale-[1.08]"
                  />
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-3 max-w-[calc(100%-1.5rem)] inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-foreground rounded-full px-3 py-1.5 text-xs font-semibold">
                    <span className="truncate min-w-0">{next.title}</span>
                    <ArrowUpRight
                      size={13}
                      strokeWidth={2.5}
                      className="shrink-0"
                    />
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

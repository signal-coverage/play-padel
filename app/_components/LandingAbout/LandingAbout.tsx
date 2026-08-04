"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ABOUT_ITEMS, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";
import { scrollToSection } from "@/lib/utils/scroll-to-section";
import communityImage from "@/assets/images/people-playing-padle-tennis-inside.jpg";

export function LandingAbout() {
  const shouldReduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(1);

  return (
    <section id="about" className={`${CONTAINER} py-12`}>
      <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
        <h2 className="text-3xl md:text-[34px] font-bold leading-tight tracking-tight">
          <span className="text-[#111111]">Built for Players Who Want</span>
          <br />
          <span className="text-[#A3A3A3]">More Than Just a Match</span>
        </h2>
        <span className="inline-flex items-center bg-[#111111] text-white rounded-full px-4 py-2 text-[13px] font-semibold">
          Paddle, People, Purpose
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="border-t border-[#E5E7EB]">
          {ABOUT_ITEMS.map((item, i) => {
            const isActive = activeIndex === i;
            return (
              <div key={item.title} className="border-b border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setActiveIndex(isActive ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-lg font-medium text-[#111111]">
                    {item.title}
                  </span>
                  <span
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-[#dffd36] text-[#111111]"
                        : "border border-[#D4D4D4] text-[#111111]"
                    }`}
                  >
                    {isActive ? (
                      <ArrowDownRight size={16} strokeWidth={2.25} />
                    ) : (
                      <ArrowUpRight size={16} strokeWidth={2.25} />
                    )}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      initial={shouldReduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm text-[#737373] leading-relaxed max-w-md text-pretty">
                        {item.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <motion.div
          className="relative rounded-[28px] overflow-hidden min-h-90 md:min-h-0 md:h-full"
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <Image
            src={communityImage}
            alt="Players sharing a moment at the net after a match"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          />
          <Link
            href="#appointment"
            onClick={(e) => scrollToSection(e, "#appointment")}
            className="absolute left-5 bottom-5 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-[#111111] rounded-full px-4 py-2 text-sm font-semibold hover:bg-white transition-colors"
          >
            Learn More
            <ArrowUpRight size={15} strokeWidth={2.5} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

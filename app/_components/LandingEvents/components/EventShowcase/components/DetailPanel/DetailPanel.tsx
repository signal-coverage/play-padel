"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SlideCounter } from "@/app/_components/SlideCounter";
import { ease } from "../../../../consts";
import type { DetailPanelProps } from "./types";

export function DetailPanel({
  event,
  index,
  total,
  onPrev,
  onNext,
}: DetailPanelProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="flex flex-col justify-between h-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={event.title}
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease }}
        >
          <h3 className="text-2xl font-bold text-[#111111] mb-3">
            {event.title}
          </h3>
          <p className="text-sm text-[#737373] leading-relaxed text-pretty">
            {event.description}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-end gap-2">
        <SlideCounter current={index + 1} total={total} className="mr-1" />
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous event"
          className="w-11 h-11 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next event"
          className="w-11 h-11 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
        >
          <ArrowRight size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

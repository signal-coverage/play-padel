"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { COLLAPSED_FLEX, OPEN_FLEX, TRANSITION } from "../../consts";
import type { StackSlotProps } from "./types";

export function StackSlot({ event, isOpen, onClick }: StackSlotProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      transition={TRANSITION}
      style={{ flexGrow: isOpen ? OPEN_FLEX : COLLAPSED_FLEX, flexBasis: 0 }}
      className="relative h-full min-w-16 shrink-0 rounded-3xl overflow-hidden cursor-pointer"
    >
      <Image
        src={event.image}
        alt={event.title}
        fill
        sizes="(min-width: 768px) 40vw, 100vw"
        className="object-cover"
      />
      {!isOpen && (
        <span className="absolute inset-0 flex items-end justify-center pb-5">
          <span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-white text-xs font-semibold tracking-wide bg-black/35 backdrop-blur-sm rounded-full px-2 py-3">
            {event.title}
          </span>
        </span>
      )}
    </motion.button>
  );
}

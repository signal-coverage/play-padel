"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import type { AvatarTabProps } from "./types";

export function AvatarTab({ testimonial, isActive, onClick }: AvatarTabProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Show testimonial from ${testimonial.name}`}
      aria-pressed={isActive}
      animate={{ scale: isActive ? 1.15 : 1 }}
      transition={{ duration: 0.3 }}
      className="relative -ml-3 first:ml-0 rounded-full ring-4 ring-white cursor-pointer"
      style={{ zIndex: isActive ? 10 : 0 }}
    >
      {testimonial.avatar ? (
        <div
          className={`relative w-12 h-12 rounded-full overflow-hidden transition-[filter,opacity] duration-300 ${
            isActive ? "grayscale-0 opacity-100" : "grayscale opacity-70"
          }`}
        >
          <Image
            src={testimonial.avatar}
            alt={testimonial.name}
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white transition-opacity duration-300 ${
            isActive ? "opacity-100" : "opacity-70 grayscale"
          }`}
          style={{
            background: `linear-gradient(135deg, ${testimonial.avatarFrom}, ${testimonial.avatarTo})`,
          }}
        >
          {testimonial.initials}
        </div>
      )}
    </motion.button>
  );
}

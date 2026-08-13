"use client";

import { motion } from "framer-motion";
import { LogoBadge } from "@/components/LogoBadge";

export function AuthLeftPanel() {
  return (
    <div
      className="hidden md:flex md:flex-col relative overflow-hidden shrink-0"
      style={{ width: "34%" }}
    >
      {/* Photo simulation — replace with next/image when photo is available */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 75%, black) 55%, color-mix(in oklch, var(--primary) 45%, black) 100%)",
        }}
      />
      {/* Accent glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 72% 28%, color-mix(in oklch, var(--accent) 35%, transparent) 0%, color-mix(in oklch, var(--accent) 14%, transparent) 38%, transparent 65%)",
        }}
      />
      {/* Cool ambient fill */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 25% 72%, color-mix(in oklch, var(--secondary) 22%, transparent) 0%, transparent 52%)",
        }}
      />
      {/* Reading-gradient overlay for text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.04) 45%, rgba(0,0,0,0.58) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full p-9">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex items-center gap-2.5"
        >
          <LogoBadge size="sm" />
          <span className="text-white font-semibold text-sm tracking-tight">
            Play Padel
          </span>
        </motion.div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.15 }}
          className="space-y-4"
        >
          <p
            className="text-white font-bold leading-snug"
            style={{ fontSize: "22px", maxWidth: "290px" }}
          >
            &ldquo;Booking a court used to mean phone tag with the front desk.
            Now it takes ten seconds.&rdquo;
          </p>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Marina López
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(255,255,255,0.48)" }}
            >
              Owner, Level Up Padel Club
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

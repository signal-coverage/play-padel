"use client";

import { motion } from "framer-motion";

export function AuthLeftPanel() {
  return (
    <div
      className="relative overflow-hidden shrink-0 flex flex-col"
      style={{ width: "34%" }}
    >
      {/* Photo simulation — replace with next/image when photo is available */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, #1a0f2e 0%, #2e1a4a 25%, #1e1535 55%, #0f0a1e 100%)",
        }}
      />
      {/* Warm desk-lamp light */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 72% 28%, rgba(210,135,55,0.20) 0%, rgba(180,95,35,0.09) 38%, transparent 65%)",
        }}
      />
      {/* Cool ambient fill */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 25% 72%, rgba(100,70,165,0.18) 0%, transparent 52%)",
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
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.22)",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
              <rect
                x="8"
                y="1"
                width="5"
                height="5"
                rx="1"
                fill="white"
                fillOpacity="0.7"
              />
              <rect
                x="1"
                y="8"
                width="5"
                height="5"
                rx="1"
                fill="white"
                fillOpacity="0.7"
              />
              <rect
                x="8"
                y="8"
                width="5"
                height="5"
                rx="1"
                fill="white"
                fillOpacity="0.4"
              />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">
            ERPFlow
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
            &ldquo;Simply all the tools that my team and I need.&rdquo;
          </p>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Karen Yue
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(255,255,255,0.48)" }}
            >
              Director of Digital Marketing Technology
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

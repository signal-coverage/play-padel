"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { subscribeToSuccessCelebration } from "@/lib/utils/celebration";
import { TennisBallIcon } from "@/components/TennisBallIcon";
import {
  BALL_COUNT,
  CELEBRATION_DURATION_MS,
  BOUNCE_EASE,
  BOUNCE_TIMES,
} from "./consts";
import type { BallProps } from "./types";

let nextCelebrationId = 0;

// One falling, bouncing ball. `index` only ever varies placement/timing —
// deterministically, not randomly — so this renders identically given the
// same props (no `Math.random()`), matching this codebase's general
// preference for predictable, testable rendering.
function Ball({ index }: BallProps) {
  const leftPercent =
    BALL_COUNT === 1 ? 50 : 10 + (index * 80) / (BALL_COUNT - 1);
  const delay = (index % 4) * 0.08;
  const fallDistance = 260 + (index % 3) * 40;

  return (
    <motion.div
      className="absolute top-0"
      style={{ left: `${leftPercent}%` }}
      initial={{ y: -40, opacity: 0, rotate: 0 }}
      animate={{
        y: [
          -40,
          fallDistance,
          fallDistance * 0.55,
          fallDistance,
          fallDistance * 0.28,
          fallDistance,
          fallDistance * 0.12,
          fallDistance,
        ],
        opacity: [0, 1, 1, 1, 1, 1, 1, 0],
        rotate: [0, 180, 260, 380, 430, 520, 550, 600],
      }}
      transition={{
        delay,
        duration: CELEBRATION_DURATION_MS / 1000,
        // Framer Motion wants mutable arrays here; BOUNCE_TIMES/BOUNCE_EASE
        // stay `as const` in consts.ts for their own literal-type safety
        // (so a typo like "easeInn" is caught at the source), so they're
        // copied into fresh arrays only at this call site.
        times: [...BOUNCE_TIMES],
        ease: [...BOUNCE_EASE],
      }}
    >
      <TennisBallIcon />
    </motion.div>
  );
}

// One full celebration burst (a set of balls dropping together), removed
// from the portal's active list once its own animation has finished.
function BallDrop({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, CELEBRATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <>
      {Array.from({ length: BALL_COUNT }, (_, index) => (
        <Ball key={index} index={index} />
      ))}
    </>
  );
}

// Mounted exactly once, near the app root (see app/layout.tsx) — same
// pattern this app already uses for toasts (components/ui/sonner's own
// `<Toaster />`): callers fire `fireSuccessCelebration()` from anywhere
// without needing to render or manage anything themselves. A list (not a
// single boolean) because two success moments could in principle land
// close together — each gets its own independent drop, keyed so
// framer-motion never conflates or restarts an in-flight one.
export function SuccessCelebrationPortal() {
  const [activeDrops, setActiveDrops] = useState<number[]>([]);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    return subscribeToSuccessCelebration(() => {
      // Belt-and-suspenders: every current caller of
      // `fireSuccessCelebration` already checks this before calling (see
      // its own doc comment), but a future caller forgetting to shouldn't
      // still play a motion effect for someone who's asked not to see one.
      if (shouldReduceMotion) return;
      setActiveDrops((prev) => [...prev, nextCelebrationId++]);
    });
  }, [shouldReduceMotion]);

  if (activeDrops.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-100 overflow-hidden"
      aria-hidden="true"
    >
      {activeDrops.map((id) => (
        <BallDrop
          key={id}
          onDone={() =>
            setActiveDrops((prev) => prev.filter((dropId) => dropId !== id))
          }
        />
      ))}
    </div>
  );
}

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
  DRIFT_VW_MIN,
  DRIFT_VW_STEP,
  FALL_VH_MIN,
  FALL_VH_STEP,
} from "./consts";
import type { BallProps } from "./types";

let nextCelebrationId = 0;

// One falling, bouncing, drifting ball. `index` only ever varies placement/
// timing/size/direction — deterministically, not randomly — so this renders
// identically given the same props (no `Math.random()`), matching this
// codebase's general preference for predictable, testable rendering.
function Ball({ index }: BallProps) {
  // Near-full width (4%-96%, not the ball's own edge-to-edge 0-100%) so the
  // group reads as covering the whole screen without any ball's icon
  // clipping past the viewport edge.
  const leftPercent =
    BALL_COUNT === 1 ? 50 : 4 + (index * 92) / (BALL_COUNT - 1);
  const delay = (index % 6) * 0.08;
  const fallVh = FALL_VH_MIN + (index % 3) * FALL_VH_STEP;
  // Bigger balls read as "closer", smaller ones as "farther" — cheap depth
  // cue that also just makes the whole burst feel bigger and more varied
  // than a uniform grid of same-size icons.
  const size = 18 + (index % 4) * 5;
  // Alternating direction per ball (not every ball drifting the same way)
  // is what makes the group actually scatter outward instead of sliding
  // sideways together as one block.
  const driftVw =
    (index % 2 === 0 ? 1 : -1) * (DRIFT_VW_MIN + (index % 5) * DRIFT_VW_STEP);
  const spin = index % 3 === 0 ? -1 : 1;

  return (
    <motion.div
      className="absolute top-0"
      style={{ left: `${leftPercent}%` }}
      initial={{ y: "-8vh", x: 0, opacity: 0, rotate: 0 }}
      animate={{
        y: [
          "-8vh",
          `${fallVh}vh`,
          `${fallVh * 0.55}vh`,
          `${fallVh}vh`,
          `${fallVh * 0.28}vh`,
          `${fallVh}vh`,
          `${fallVh * 0.12}vh`,
          `${fallVh}vh`,
        ],
        // Steps outward at each bounce's impact rather than a smooth
        // constant drift — reads as the ball actually skipping sideways on
        // contact, the same way a real bounced ball would.
        x: [
          "0vw",
          `${driftVw * 0.25}vw`,
          `${driftVw * 0.25}vw`,
          `${driftVw * 0.55}vw`,
          `${driftVw * 0.55}vw`,
          `${driftVw * 0.8}vw`,
          `${driftVw * 0.8}vw`,
          `${driftVw}vw`,
        ],
        opacity: [0, 1, 1, 1, 1, 1, 1, 0],
        rotate: [0, 180, 260, 380, 430, 520, 550, 600].map((deg) => deg * spin),
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
      <TennisBallIcon size={size} />
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

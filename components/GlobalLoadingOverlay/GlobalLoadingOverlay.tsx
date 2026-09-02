"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BouncingBall } from "@/components/BouncingBall";
import { BALL_TRANSITION } from "@/components/BouncingBall/consts";
import { BACKDROP_TRANSITION, SHADOW_OPACITY, SHADOW_SCALE } from "./consts";
import type { GlobalLoadingOverlayProps } from "./types";

// The standard loading indicator going forward for any in-flight save/submit
// across the app: a full-screen dimmed overlay with a tennis ball bouncing
// in place, centered — never an inline spinner on the triggering button
// itself. Replaces TennisBallSpinner (CourtFormSheet's own button-icon
// spinner), which turned out to blend into the button's background in dark
// mode and had no way to guarantee contrast against an arbitrary button
// color. An overlay sidesteps that entirely: it always sits on its own
// dimmed backdrop, never on a variable background.
export function GlobalLoadingOverlay({
  open,
  label = "Loading…",
}: GlobalLoadingOverlayProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-5 bg-background/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={BACKDROP_TRANSITION}
          role="status"
          aria-label={label}
        >
          <div className="flex flex-col items-center">
            <BouncingBall size={48} amplitude={26} />
            <motion.div
              className="mt-1 h-2 w-9 rounded-full bg-foreground"
              animate={
                shouldReduceMotion
                  ? undefined
                  : { scaleX: SHADOW_SCALE, opacity: SHADOW_OPACITY }
              }
              transition={BALL_TRANSITION}
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

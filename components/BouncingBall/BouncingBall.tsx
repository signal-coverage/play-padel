"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TennisBallIcon } from "@/components/TennisBallIcon";
import { BALL_SCALE_X, BALL_SCALE_Y, BALL_TRANSITION } from "./consts";
import type { BouncingBallProps } from "./types";

// The single shared bounce — GlobalLoadingOverlay's big centered loader and
// the Toaster's small per-type status icon both wrap TennisBallIcon in this
// exact same motion instead of each defining their own, so "the loader that
// bounces" stays literally one animation, not two that could drift apart.
export function BouncingBall({
  amplitude = 10,
  size,
  fill,
  stroke,
}: BouncingBallProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      className="inline-flex"
      animate={
        shouldReduceMotion
          ? undefined
          : {
              y: [0, -amplitude, 0],
              scaleX: BALL_SCALE_X,
              scaleY: BALL_SCALE_Y,
            }
      }
      transition={BALL_TRANSITION}
    >
      <TennisBallIcon size={size} fill={fill} stroke={stroke} />
    </motion.span>
  );
}

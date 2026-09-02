// How many balls drop per celebration, and roughly how long the whole
// bounce-and-fade sequence takes (used to time this celebration's own
// removal from SuccessCelebrationPortal's active list).
export const BALL_COUNT: number = 10;
export const CELEBRATION_DURATION_MS = 2000;

// Per-ball animation timing, expressed as normalized [0, 1] fractions of
// CELEBRATION_DURATION_MS (framer-motion's own `times` option) — three
// bounces of decreasing height, then a fade. Falls use "easeIn"
// (accelerating, like gravity pulling it down); rises use "easeOut"
// (decelerating, like it's fighting gravity going up) — alternating,
// one per keyframe segment (framer-motion accepts `ease` as an array,
// one entry per segment between consecutive keyframes).
export const BOUNCE_TIMES = [0, 0.2, 0.35, 0.5, 0.62, 0.74, 0.85, 1] as const;
export const BOUNCE_EASE = [
  "easeIn",
  "easeOut",
  "easeIn",
  "easeOut",
  "easeIn",
  "easeOut",
  "easeIn",
] as const;

// How many balls drop per celebration, and roughly how long the whole
// bounce-and-fade sequence takes (used to time this celebration's own
// removal from SuccessCelebrationPortal's active list). Raised from the
// original 10 -> 16 now that balls spread across the full viewport width
// (see SuccessCelebrationPortal.tsx's Ball component) — 10 looked sparse
// once they weren't all clustered in the middle 80%. Duration nudged up
// slightly too, since each ball now falls much further (see FALL_VH_MIN/
// FALL_VH_MAX below) and needs a touch more time to read as smooth rather
// than rushed.
export const BALL_COUNT: number = 16;
export const CELEBRATION_DURATION_MS = 2400;

// Each ball's fall distance in vh (viewport height), not a fixed px value —
// this is what actually fixes the "only appears in the top half of the
// screen" report: a fixed px distance (the old ~260-340px) only ever covers
// a fixed band near the top on any screen taller than that, regardless of
// the actual viewport size. Expressing it as vh instead means every ball
// genuinely falls most of the way down the screen on any device.
export const FALL_VH_MIN = 60;
export const FALL_VH_STEP = 12;

// How far each ball drifts sideways as it falls, in vw (viewport width) —
// the actual "more than just vertical" motion: without this every ball
// falls in a dead-straight vertical line and the whole celebration reads as
// one repeated up-down motion. Direction alternates per ball (see
// SuccessCelebrationPortal.tsx), so the group visibly scatters left and
// right instead of drifting as one block.
export const DRIFT_VW_MIN = 4;
export const DRIFT_VW_STEP = 2;

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

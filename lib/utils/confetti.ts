import confetti from "canvas-confetti";

/**
 * Fires a short, single-burst confetti effect to celebrate a success moment
 * (e.g. booking confirmed, payment confirmed). This is a motion effect —
 * callers must check `prefers-reduced-motion` (via `useReducedMotion` from
 * `framer-motion`, the convention already used elsewhere in this codebase)
 * and skip calling this when the user has that preference set.
 */
export function fireSuccessConfetti(): void {
  confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 40,
    origin: { y: 0.6 },
  });
}

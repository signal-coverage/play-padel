// Fires the tennis-ball bounce celebration (see components/SuccessCelebration)
// from anywhere — mutation `onSuccess` handlers, effects — without those
// callers needing to know or care that a component tree is involved at all.
// `EventTarget` is a standard global in both the browser AND modern Node
// (15+), so constructing this at module scope is safe even when this module
// is pulled in during Next.js's server render of a "use client" component —
// unlike the previous canvas-confetti-based version, nothing here ever
// touches `document`/canvas.
//
// `SuccessCelebrationPortal`, mounted once in app/layout.tsx (the same
// pattern this app already uses for toasts — see components/ui/sonner's
// `<Toaster />`), is the sole listener: it owns actually rendering and
// animating the bouncing balls.
const celebrationEmitter = new EventTarget();
const CELEBRATE_EVENT = "success-celebration";

/**
 * Fires the tennis-ball bounce celebration to mark a success moment (e.g.
 * booking confirmed, payment confirmed). This is a motion effect — callers
 * must check `prefers-reduced-motion` (via `useReducedMotion` from
 * `framer-motion`, the convention already used elsewhere in this codebase)
 * and skip calling this when the user has that preference set.
 */
export function fireSuccessCelebration(): void {
  celebrationEmitter.dispatchEvent(new Event(CELEBRATE_EVENT));
}

/** Used only by `SuccessCelebrationPortal` — see its own file. */
export function subscribeToSuccessCelebration(onFire: () => void): () => void {
  celebrationEmitter.addEventListener(CELEBRATE_EVENT, onFire);
  return () => celebrationEmitter.removeEventListener(CELEBRATE_EVENT, onFire);
}

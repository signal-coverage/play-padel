import { cn } from "@/lib/utils/utils";
import type { PlanEmphasis } from "@/lib/consts/planPricing";

// Hexagon shape for the plan icon badge, via clip-path — mirrors
// PlanStep/components/PlanPricingCard/styles.ts's hexagonClipPath (same
// reference visual language this card is matching), kept as a local copy
// per the SRP-per-folder convention rather than imported across folders.
export const hexagonClipPath =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

// The full PLAN_EMPHASIS-driven border/shadow/ring treatment is reserved
// for the selected card — an unselected card falls back to the Card
// component's own default neutral border and shadow-card instead, so the
// selected tile is the only one that reads as "alive" at a glance.
// Unselected cards are additionally desaturated + dimmed (grayscale +
// opacity) so they read as disabled-but-clickable, not just less colorful —
// both lift back to normal on hover/focus so the card still reads as
// interactive rather than actually disabled. `filter`/`opacity` get their
// own transition-* utility alongside the existing color/shadow ones (no
// `transition: all` — matches this app's existing interactive-card
// restraint, see OptionCard/styles.ts).
export function getCardClassName(isSelected: boolean, emphasis: PlanEmphasis) {
  return cn(
    // border-2 (not border) unconditionally: MAX's emphasis.cardBorder below
    // is the only one that carries a border-WIDTH utility (the others only
    // change border color on selection). Reserving 2px here always means
    // selecting MAX only ever changes color/shadow/ring, never width — if
    // the baseline were a plain 1px `border`, selecting MAX would bump it to
    // 2px and grow the card's (height: auto) rendered height by ~2px, which
    // no other tier's selected state does.
    "relative flex-1 overflow-hidden rounded-sm border-2 py-6 transition-colors transition-shadow transition-[filter,opacity]",
    isSelected
      ? cn(
          emphasis.cardBorder,
          emphasis.cardShadow,
          emphasis.ring,
          "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
        )
      : "grayscale opacity-70 hover:grayscale-0 hover:opacity-100 focus-visible:grayscale-0 focus-visible:opacity-100 hover:border-muted-foreground/30 hover:bg-muted/30",
  );
}

// Decorative background wash: colored (emphasis.wash) only when selected,
// a neutral muted tint otherwise — dropping the colored wash is part of
// muting an unselected card's chrome without touching its text.
export function getWashClassName(isSelected: boolean, emphasis: PlanEmphasis) {
  return isSelected ? cn("bg-linear-to-br", emphasis.wash) : "bg-muted/20";
}

// Icon badge: full-color gradient + glow only when selected, a neutral
// muted swatch otherwise — same "mute the decorative chrome, not the
// content" rule as the wash and border above.
export function getIconBadgeClassName(
  isSelected: boolean,
  emphasis: PlanEmphasis,
) {
  return isSelected
    ? cn(
        "bg-linear-to-br from-primary to-primary/70 text-primary-foreground",
        emphasis.iconShadow,
      )
    : "bg-muted text-muted-foreground";
}

// --- Motion ---
//
// This app's established spring recipe for contextual selection moments
// (see better-ui's contextual-icon-animation convention and this card's own
// scale pop): `type: "spring"`, `duration: 0.3`, `bounce` always `0`. Shared
// by the card's selection scale-pop and the check-badge's enter/exit so both
// halves of "a card becomes selected" move in lockstep.
export const selectionSpringTransition = {
  type: "spring" as const,
  duration: 0.3,
  bounce: 0,
};

const ENTRANCE_DURATION_SECONDS = 0.3;
const ENTRANCE_STAGGER_SECONDS = 0.08;

// Starting point for the card's one-time fade+slide entrance (see
// PlanOptionCard.tsx for why prop changes from billingCycle/selection never
// replay this — the card only mounts once, when the grid first swaps in
// from its loading skeleton).
export const cardEntranceInitial = { opacity: 0, y: 12 };

// Per-property transition map for the card's `animate` prop: opacity/y only
// ever move once (the mount entrance, staggered by `index`), while `scale`
// is driven independently by isSelected and reuses the shared spring recipe
// above so the scale pop stays consistent whenever it fires.
export function getCardMotionTransition(index: number) {
  const entranceTransition = {
    duration: ENTRANCE_DURATION_SECONDS,
    ease: "easeOut" as const,
    delay: index * ENTRANCE_STAGGER_SECONDS,
  };
  return {
    opacity: entranceTransition,
    y: entranceTransition,
    scale: selectionSpringTransition,
  };
}

// Check-badge appearance: same opacity+scale+blur icon-animation recipe
// established elsewhere in this app for contextual icon appearances.
export const checkBadgeInitial = {
  opacity: 0,
  scale: 0.25,
  filter: "blur(4px)",
};
export const checkBadgeAnimate = { opacity: 1, scale: 1, filter: "blur(0px)" };

// Fast cross-fade for the price block when billingCycle toggles — simpler
// and quicker than PlanPricingCard's full-card flip since this is a smaller
// content swap, not a whole-card transition.
export const priceCrossfadeTransition = {
  duration: 0.18,
  ease: "easeOut" as const,
};
export const priceCrossfadeInitial = { opacity: 0, y: 4 };
export const priceCrossfadeExit = { opacity: 0, y: -4 };

// Framer Motion variants for the plan card's 3D flip transition, played
// whenever the selected plan changes. Kept intentionally restrained (no
// bounce, short duration) to match this app's established motion
// convention — see OnboardingWizard's stepVariants/stepTransition.
export const flipVariants = {
  enter: { rotateY: 90, opacity: 0 },
  center: { rotateY: 0, opacity: 1 },
  exit: { rotateY: -90, opacity: 0 },
};

export const flipTransition = { duration: 0.35, ease: "easeOut" as const };

// Hexagon shape for the plan icon badge, via clip-path — deliberately not
// the app's usual rounded-square badge (see LogoBadge): the reference this
// card is matching uses hexagons specifically, and this is a one-off,
// marketing-forward moment rather than a reusable badge pattern.
export const hexagonClipPath =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

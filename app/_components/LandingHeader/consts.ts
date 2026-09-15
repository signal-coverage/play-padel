export { ease } from "@/lib/consts/animation";

export const SCROLL_THRESHOLD = 40;

// labelKey maps to messages/*.json's LandingHeader.nav.<labelKey> — href
// stays here since it's structural (anchor target), not translatable copy.
export const NAV = [
  { labelKey: "about", href: "#about" },
  { labelKey: "features", href: "#features" },
  { labelKey: "pricing", href: "#pricing" },
  { labelKey: "getStarted", href: "#appointment" },
] as const;

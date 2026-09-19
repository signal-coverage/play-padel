export { ease } from "@/lib/consts/animation";

// labelKey maps to messages/*.json's LandingHeader.nav.<labelKey> — href
// stays here since it's structural (anchor target), not translatable copy.
export const NAV = [
  { labelKey: "features", href: "#features" },
  { labelKey: "testimonials", href: "#testimonials" },
  { labelKey: "pricing", href: "#pricing" },
  { labelKey: "faq", href: "#faq" },
] as const;

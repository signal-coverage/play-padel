import type { Locale } from "@/i18n/localeConstants";

// 🇦🇷 for Spanish (not the generic 🇪🇸) — this app is explicitly built for
// the Argentine padel market first (see LandingFeatures' "Built for
// Argentina" copy, and DEFAULT_LOCALE in i18n/locale.ts), so the flag
// should read as on-brand, not just "a Spanish-speaking country".
export const LOCALE_FLAGS: Record<Locale, string> = {
  es: "🇦🇷",
  en: "🇺🇸",
};

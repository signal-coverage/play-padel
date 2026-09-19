import type { Locale } from "./localeConstants";

// English is temporarily hidden site-wide — LocaleSwitcher removed from
// LandingHeader/AppNavbar, /en redirects to / — while the site is tuned
// for Spanish-only SEO before the real translation pass happens. This
// forces Spanish even for a visitor whose locale cookie already says "en"
// from before this change, since there's currently no UI for them to flip
// it back themselves.
//
// getUserLocale() itself (core/notifications, core/users,
// app/api/onboarding) is untouched by this — only this wrapper, used by
// i18n/request.ts + app/layout.tsx for what actually renders, is forced.
// To bring English back: replace the body below with `return
// getUserLocale();`.
export async function getRequestLocale(): Promise<Locale> {
  return "es";
}

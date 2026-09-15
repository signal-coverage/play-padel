// Pure constants/types only — zero runtime imports, safe to import from
// BOTH Server and Client Components (app/global-error.tsx, a Client
// Component, needs LOCALE_COOKIE_NAME/Locale directly since it can't reach
// the normal server-rendered locale path — see that file's own comment).
//
// getUserLocale() (./locale.ts) and setUserLocale() (./localeActions.ts)
// both import from here rather than defining these locally, so there's one
// place a Client Component can safely pull the cookie name/type from
// without also pulling in next/headers — which ./locale.ts imports, and
// which Next.js's bundler forbids in any module reachable from a Client
// Component's import graph, even for an unused value.
export type Locale = "en" | "es";

export const LOCALE_COOKIE_NAME = "locale";

export const DEFAULT_LOCALE: Locale = "es";

// Shared narrowing check — used wherever an untrusted string (a cookie
// value, a raw DB column, an HTTP header) needs to become a real Locale.
// Kept here, not duplicated per call site, so "which locales are valid"
// only has one source of truth.
export function isValidLocale(
  value: string | null | undefined,
): value is Locale {
  return value === "en" || value === "es";
}

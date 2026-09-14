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

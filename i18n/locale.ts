import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME, type Locale } from "./localeConstants";

// Server-only (imports next/headers) — never import this file from a
// Client Component; import Locale/LOCALE_COOKIE_NAME straight from
// ./localeConstants instead (see that file's own comment for why).
//
// Spanish by default — this app is built for the Argentine padel market
// first (see LandingFeatures' own "Built for Argentina" copy); a visitor
// who never touches the LocaleSwitcher gets Spanish, not English.
const DEFAULT_LOCALE: Locale = "es";

export async function getUserLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE_NAME)?.value;
  return value === "en" || value === "es" ? value : DEFAULT_LOCALE;
}

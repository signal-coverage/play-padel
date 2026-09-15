import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isValidLocale,
  type Locale,
} from "./localeConstants";

// Server-only (imports next/headers) — never import this file from a
// Client Component; import Locale/LOCALE_COOKIE_NAME/DEFAULT_LOCALE/
// isValidLocale straight from ./localeConstants instead (see that file's
// own comment for why).
export async function getUserLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE_NAME)?.value;
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}

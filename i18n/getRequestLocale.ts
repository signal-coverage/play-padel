import type { Locale } from "./localeConstants";

/**
 * Returns Spanish as the locale for rendered requests while the English UI
 * is disabled. This does not alter the locale stored for the user.
 */
export async function getRequestLocale(): Promise<Locale> {
  return "es";
}

"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME, type Locale } from "./localeConstants";

// Split into its OWN file (file-level "use server", exporting nothing else)
// rather than living inline inside ./locale.ts alongside getUserLocale/
// LOCALE_COOKIE_NAME/Locale — that file is also imported by
// app/global-error.tsx (a Client Component, for LOCALE_COOKIE_NAME/Locale
// only), and Next.js's server-actions compiler forbids ANY module reachable
// from a Client Component's import graph from containing an inline
// "use server" annotated function, even one that Client Component never
// actually calls. A dedicated actions-only file is exactly the fix Next's
// own error message recommends.
export async function setUserLocale(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE_NAME, locale);
}

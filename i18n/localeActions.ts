"use server";

import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
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
//
// Also persists to UserProfile.locale for a SIGNED-IN caller (see
// prisma/schema.prisma's UserProfile.locale doc comment for why) — the
// cookie alone only covers this one browser; the DB column is what lets
// server-side notification dispatch (lib/notifications/content.ts) resolve
// which language to render a given RECIPIENT's email/in-app notification
// in, regardless of which session/device/browser actually triggered the
// action that generated it.
//
// updateMany (never throws on a zero-row match), same pattern as
// anonymizeUserProfile in core/users/services/users.service.ts — a
// signed-in Clerk user who hasn't finished onboarding yet has no
// UserProfile row at all, and flipping the landing header's switcher
// before signing up is a completely valid, common case this must not
// error on.
export async function setUserLocale(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE_NAME, locale);

  const { userId } = await auth();
  if (!userId) return;

  const { prisma } = await import("@/infrastructure/db/client");
  await prisma.userProfile.updateMany({
    where: { id: userId },
    data: { locale, updatedBy: userId },
  });
}

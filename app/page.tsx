import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LandingPage } from "@/app/_components/LandingPage";

// Overrides the root layout's (English) default title/description with the
// real Spanish copy for this, the actual page real visitors land on — the
// layout defaults were never localized, so Google was showing an English
// snippet for a Spanish-market page. No `languages` hreflang block right
// now: /en just redirects here while English is hidden (see
// i18n/getRequestLocale.ts) — add it back once that page has real content
// again.
export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const t = await getTranslations("HomePage");
  return {
    // `absolute` bypasses the root layout's `%s | Play Padel` template —
    // this title already carries the brand name in the same "Brand —
    // tagline" shape the layout's own default does, so the template would
    // otherwise duplicate it ("... | Play Padel" appended a second time).
    title: { absolute: t("title") },
    description: t("description"),
    alternates: {
      canonical: appUrl,
    },
  };
}

export default async function HomePage() {
  return <LandingPage />;
}

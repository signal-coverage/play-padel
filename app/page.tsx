import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LandingPage } from "@/app/_components/LandingPage";

// Overrides the root layout's default title/description with the real
// Spanish copy for this, the actual page real visitors land on — the
// layout defaults were never localized, so Google was showing a generic
// snippet for a Spanish-market page. No `languages` hreflang block: the app
// is Spanish-only, there is no second language to alternate to.
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

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LandingFooter, LandingHeader } from "@/app/_components";
import { CONTAINER } from "@/lib/consts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PrivacyPage");
  // See app/terms/page.tsx — without this it silently inherits the root
  // layout's canonical (the homepage) instead of pointing at itself.
  return { title: t("heading"), alternates: { canonical: "/privacy" } };
}

export default async function PrivacyPage() {
  const t = await getTranslations("PrivacyPage");

  return (
    <div className="theme-light font-(family-name:--font-jakarta) bg-white">
      <LandingHeader />
      <main className={`${CONTAINER} pt-32 pb-24 md:pt-44`}>
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl md:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
            {t("heading")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("lastUpdated")}
          </p>
          <div className="mt-8 border-t border-dashed border-border pt-8 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {t("content", { brand: "Play Padel" })}
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LandingFooter, LandingHeader } from "@/app/_components";
import { CONTAINER } from "@/lib/consts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TermsPage");
  // Without this, this page silently inherits the root layout's canonical
  // (the homepage) instead of pointing at itself — see app/(auth)/login for
  // why a wrong canonical is a real indexing problem, not just noise.
  return { title: t("heading"), alternates: { canonical: "/terms" } };
}

// Renders the exact same legal text the user accepts in TermsStep during
// onboarding (OnboardingWizard.steps.terms.content) — a single source of
// truth, so this page can never drift out of sync with what was actually
// agreed to at signup.
export default async function TermsPage() {
  const t = await getTranslations("TermsPage");
  const tTerms = await getTranslations("OnboardingWizard.steps.terms");

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
            {tTerms("content", { brand: "Play Padel" })}
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

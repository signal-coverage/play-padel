import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { getUserProfile } from "@/core/users/services/users.service";
import { hasCompletedOnboarding } from "@/core/users/utils";
import { PLAN_ORDER } from "@/components/PlanSelectionModal/consts";
import { PLAN_DETAILS } from "@/lib/consts/planPricing";
import {
  HomeAnalytics,
  LandingAbout,
  LandingFaq,
  LandingFeatures,
  LandingFooter,
  LandingHeader,
  LandingHero,
  LandingPricing,
  LandingStats,
  LandingTestimonials,
  LandingWhatsAppButton,
} from "@/app/_components";

interface FaqTranslation {
  question: string;
  answer: string;
}

// The actual landing page body, shared by app/page.tsx (Spanish, the
// cookie-driven default) and app/en/page.tsx (the standalone English URL —
// see i18n/getRequestLocale.ts for how that route forces its locale). Both
// pages render this exact same component so the two language versions can
// never drift apart from each other; only their own generateMetadata
// (canonical + hreflang alternates) differs between the two.
//
// A signed-in visitor has no reason to see marketing content — send them
// straight to the app instead of making them notice "Go to app" in the
// header themselves. Whichever redirect target actually applies (Clerk's
// own post-auth redirect, or a stray one from wherever they came from)
// landing them back here is exactly the case this exists to catch.
//
// Shares `hasCompletedOnboarding` with OnboardingLayout and DashboardGuard
// rather than re-deriving "is this account done onboarding?" a third time
// — those two used to disagree (one checked "a UserProfile row exists",
// the other "role set, and if owner, clubId set"), which let an owner
// stuck mid-club-creation bounce forever between /dashboard and
// /onboarding. Reproduced live via a real Google sign-in.
export async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    const profile = await getUserProfile(userId);
    redirect(hasCompletedOnboarding(profile) ? "/dashboard" : "/onboarding");
  }

  const t = await getTranslations("LandingFaq");
  const faqItems = t.raw("items") as FaqTranslation[];
  const tPlan = await getTranslations("PlanPricingDetails");

  // FAQPage schema built straight from the same LandingFaq.items
  // translations LandingFaq.tsx itself renders (via the client
  // useTranslations hook), so this structured data can never drift out of
  // sync with a hand-duplicated copy of the questions/answers.
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  // One Product-with-nested-Offer per real pricing plan, in PLAN_ORDER (the
  // same read-only plan list/data LandingPricing already imports from
  // lib/consts/planPricing and components/PlanSelectionModal/consts). MAX is
  // skipped — it has no fixed monthlyPrice, and Offer.price must never be
  // fabricated for a "contact us" tier.
  const planStructuredData = PLAN_ORDER.filter(
    (plan) => PLAN_DETAILS[plan].monthlyPrice !== null,
  ).map((plan) => {
    const details = PLAN_DETAILS[plan];
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `Play Padel ${plan}`,
      description: tPlan(`${plan}.tagline`),
      offers: {
        "@type": "Offer",
        price: details.monthlyPrice,
        priceCurrency: "ARS",
      },
    };
  });

  return (
    <div className="theme-light font-(family-name:--font-jakarta) bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(planStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomeAnalytics />
      <LandingHeader />
      <LandingHero />
      <LandingStats />
      <LandingFeatures />
      <LandingAbout />
      <LandingTestimonials />
      <LandingPricing />
      <LandingFaq />
      <LandingFooter />
      <LandingWhatsAppButton />
    </div>
  );
}

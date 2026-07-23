import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CommunityStats } from "@/components/landing/community-stats";
import { FeaturedExperiences } from "@/components/landing/featured-experiences";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/nav";
import { Testimonials } from "@/components/landing/testimonials";
import { WhyChoose } from "@/components/landing/why-choose";
import { getOrCreateAppUser, isEmailVerified } from "@/lib/dal";

/**
 * Public marketing landing page (design read: premium sports/community
 * landing for a padel court-booking platform, energetic and modern, for a
 * design-conscious consumer audience - shadcn/ui + Tailwind v4, real
 * photography, restrained motion).
 *
 * Lives at the true root, outside the `(app)` route group, so anonymous
 * visitors see it instead of being redirected to `/sign-in`. Signed-in
 * users hitting `/` are routed to wherever the `(app)` gate would send
 * them (onboarding, email verification, or `/clubs`), mirroring the gate
 * in `app/(app)/layout.tsx` without forcing an unauthenticated visitor
 * through it.
 */
export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    const user = await getOrCreateAppUser();

    if (!user.onboardingComplete) {
      redirect("/onboarding");
    }

    if (!(await isEmailVerified())) {
      redirect("/verify-email");
    }

    redirect("/clubs");
  }

  return (
    <div className="flex flex-1 flex-col [&_h1]:font-(family-name:--font-instrument-sans) [&_h2]:font-(family-name:--font-instrument-sans) [&_h3]:font-(family-name:--font-instrument-sans)">
      <LandingNav />
      <Hero />
      <CommunityStats />
      <WhyChoose />
      <FeaturedExperiences />
      <Testimonials />
      <FinalCta />
      <Footer />
    </div>
  );
}

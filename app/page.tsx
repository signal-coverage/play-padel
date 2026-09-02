import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserProfile } from "@/core/users/services/users.service";
import { hasCompletedOnboarding } from "@/core/users/utils";
import {
  HomeAnalytics,
  LandingAbout,
  LandingCtaBanner,
  LandingFeatures,
  LandingFooter,
  LandingHeader,
  LandingHero,
  LandingTrusted,
} from "@/app/_components";

// A signed-in visitor has no reason to see marketing content — send them
// straight to the app instead of making them notice "Go to app" in the
// header themselves. Whichever redirect target actually applies (Clerk's
// own post-auth redirect, or a stray one from wherever they came from)
// landing them back on "/" is exactly the case this exists to catch.
//
// Shares `hasCompletedOnboarding` with OnboardingLayout and DashboardGuard
// rather than re-deriving "is this account done onboarding?" a third time
// — those two used to disagree (one checked "a UserProfile row exists",
// the other "role set, and if owner, clubId set"), which let an owner
// stuck mid-club-creation bounce forever between /dashboard and
// /onboarding. Reproduced live via a real Google sign-in.
export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    const profile = await getUserProfile(userId);
    redirect(hasCompletedOnboarding(profile) ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="theme-light font-(family-name:--font-jakarta) bg-white">
      <HomeAnalytics />
      <LandingHeader />
      <LandingHero />
      <LandingTrusted />
      <LandingAbout />
      <LandingFeatures />
      <LandingCtaBanner />
      <LandingFooter />
    </div>
  );
}

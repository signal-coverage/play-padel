import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserProfile } from "@/core/users/services/users.service";
import { hasCompletedOnboarding } from "@/core/users/utils";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  // Shares `hasCompletedOnboarding` with app/page.tsx and DashboardGuard —
  // this used to just check "does a UserProfile row exist at all", which
  // disagreed with DashboardGuard's stricter "role set, and if owner,
  // clubId set" and let an owner stuck mid-club-creation bounce forever
  // between here and /dashboard. Reproduced live via a real Google
  // sign-in.
  const profile = await getUserProfile(userId);

  if (hasCompletedOnboarding(profile)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}

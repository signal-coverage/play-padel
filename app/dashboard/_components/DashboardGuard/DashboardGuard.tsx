"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { hasCompletedOnboarding } from "@/core/users/utils";
import { DashboardLoader } from "@/app/dashboard/_components/DashboardLoader";
import type { DashboardGuardProps } from "./types";

export function DashboardGuard({ children }: DashboardGuardProps) {
  const { user, profileLoading } = useAuth();
  const router = useRouter();

  // Shares `hasCompletedOnboarding` with app/page.tsx and
  // OnboardingLayout — this file's own inline check used to disagree with
  // OnboardingLayout's ("any UserProfile row exists" there vs. "role set,
  // and if owner, clubId set" here), which let an owner stuck
  // mid-club-creation bounce forever between here and /onboarding.
  // Reproduced live via a real Google sign-in.
  const needsOnboarding = !profileLoading && !hasCompletedOnboarding(user);

  useEffect(() => {
    if (!profileLoading && needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [profileLoading, needsOnboarding, router]);

  if (profileLoading) return <DashboardLoader />;
  if (needsOnboarding) return null;

  return <>{children}</>;
}

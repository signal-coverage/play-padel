"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLoader } from "@/app/dashboard/_components/DashboardLoader";
import type { DashboardGuardProps } from "./types";

export function DashboardGuard({ children }: DashboardGuardProps) {
  const { user, profileLoading } = useAuth();
  const router = useRouter();

  // No UserProfile row at all (never onboarded) always needs onboarding;
  // an owner specifically also needs it if their club was never created.
  // No permission system beyond this one branch.
  const needsOnboarding =
    !profileLoading && (!user?.role || (user.role === "owner" && !user.clubId));

  useEffect(() => {
    if (!profileLoading && needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [profileLoading, needsOnboarding, router]);

  if (profileLoading) return <DashboardLoader />;
  if (needsOnboarding) return null;

  return <>{children}</>;
}

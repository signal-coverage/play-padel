"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/core/organizations/hooks/use-organization";
import { Loader2 } from "lucide-react";
import type { DashboardGuardProps } from "./types";

export function DashboardGuard({ children }: DashboardGuardProps) {
  const { loading, needsOnboarding } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    if (!loading && needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [loading, needsOnboarding, router]);

  if (loading) return <DashboardLoader />;
  if (needsOnboarding) return null;

  return <>{children}</>;
}

function DashboardLoader() {
  return (
    <div className="h-svh w-full flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading your workspace…</p>
    </div>
  );
}

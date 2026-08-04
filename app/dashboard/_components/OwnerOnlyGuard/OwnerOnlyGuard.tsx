"use client";

import { StatusBox } from "@/components/StatusBox";
import { useAuth } from "@/hooks/use-auth";
import type { OwnerOnlyGuardProps } from "./types";

/**
 * Blocks owner-only dashboard pages (Courts, Reservations) from rendering
 * for a player who navigates here directly (the navbar already hides these
 * links for players — see AppNavbar/consts.ts — but the route itself is
 * still reachable by URL). The owner-scoped API routes under
 * app/api/clubs/** already 403 non-owners server-side; this just avoids
 * showing a broken/empty page instead of a clear message.
 */
export function OwnerOnlyGuard({ children }: OwnerOnlyGuardProps) {
  const { user, profileLoading } = useAuth();

  if (profileLoading) return null;

  if (user?.role !== "owner") {
    return <StatusBox>This page is only available to club owners.</StatusBox>;
  }

  return <>{children}</>;
}

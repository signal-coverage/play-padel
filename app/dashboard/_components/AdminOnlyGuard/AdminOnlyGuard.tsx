"use client";

import { StatusBox } from "@/components/StatusBox";
import { useAuth } from "@/hooks/use-auth";
import type { AdminOnlyGuardProps } from "./types";

/**
 * Blocks admin-only dashboard pages (e.g. the global Audit Log) from
 * rendering for a non-admin user who navigates here directly. Mirrors
 * OwnerOnlyGuard's shape/behavior exactly, but checks the new, additive
 * `UserProfile.isAdmin` flag (see prisma/schema.prisma) instead of `role`.
 * `isAdmin` is independent of `role` — an owner is not automatically an
 * admin, and a player can be one without losing any player capability.
 */
export function AdminOnlyGuard({ children }: AdminOnlyGuardProps) {
  const { user, profileLoading } = useAuth();

  if (profileLoading) return null;

  if (user?.isAdmin !== true) {
    return (
      <StatusBox>This page is only available to administrators.</StatusBox>
    );
  }

  return <>{children}</>;
}

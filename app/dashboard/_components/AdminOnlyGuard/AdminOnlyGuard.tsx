"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type { AdminOnlyGuardProps } from "./types";

/**
 * Blocks admin-only dashboard pages (e.g. the global Audit Log) from
 * rendering for a non-admin user who navigates here directly. Mirrors
 * OwnerOnlyGuard's shape/behavior, but checks the additive
 * `UserProfile.isAdmin` flag (see prisma/schema.prisma) instead of `role`.
 * `isAdmin` is independent of `role` — an owner is not automatically an
 * admin, and a player can be one without losing any player capability.
 *
 * Re-checks against a FRESH `/api/me` fetch every time this guard mounts
 * (via `refetchProfile`), instead of trusting whatever `isAdmin` value
 * happens to already be cached in `AuthProvider` — the whole point is
 * catching a revoke that happened server-side after that cache was last
 * populated (e.g. an admin having their own access revoked while an admin
 * tab was already open, or the navbar itself lagging behind for any other
 * reason). A stale `isAdmin: true` is redirected to `/dashboard` with an
 * explanatory toast, exactly like a genuine non-admin who navigated here
 * directly.
 */
export function AdminOnlyGuard({ children }: AdminOnlyGuardProps) {
  const { user, profileLoading, refetchProfile } = useAuth();
  const router = useRouter();
  // Distinct from `profileLoading` (which only reflects the FIRST /api/me
  // fetch this session) — tracks whether THIS mount's own fresh re-check has
  // resolved yet, so a stale-but-already-cached `isAdmin: true` never lets
  // admin content flash before the fresh check actually confirms it.
  const [rechecked, setRechecked] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    let cancelled = false;
    refetchProfile().finally(() => {
      if (!cancelled) setRechecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refetchProfile]);

  useEffect(() => {
    if (!rechecked || profileLoading || hasRedirected.current) return;
    if (user?.isAdmin !== true) {
      hasRedirected.current = true;
      toast.error("You no longer have admin access.");
      router.replace("/dashboard");
    }
  }, [rechecked, profileLoading, user, router]);

  if (profileLoading || !rechecked || user?.isAdmin !== true) return null;

  return <>{children}</>;
}

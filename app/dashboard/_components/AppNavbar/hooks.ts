"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import type { SystemRole } from "@/providers/auth-provider";
import { CLUB_OPERATIONAL_STATUS_QUERY_KEY } from "./consts";
import type { NavItem } from "./consts";
import { getVisibleNavItems } from "./utils";
import type { ClubOperationalStatusResponse } from "./types";

async function fetchClubOperationalStatus(): Promise<ClubOperationalStatusResponse> {
  const res = await fetch("/api/clubs/mercadopago/operational-status");
  if (!res.ok) {
    throw new Error("Failed to load club operational status");
  }
  return res.json();
}

/**
 * Whether the signed-in owner's club is currently operational.
 *
 * Only fires the fetch for owners (`role === "owner"`) — ClubOperationalGate
 * is never mounted for players (see DashboardShell.tsx), so nothing else
 * needs this data for them and a player session must never trigger this
 * network call.
 *
 * Returns `undefined` while the status hasn't resolved yet (or whenever the
 * query is disabled, i.e. for a player). Callers should treat `undefined`
 * the same as `true` (full nav), mirroring ClubOperationalGate's own
 * `isLoading || !status || status.operational` convention — this keeps the
 * nav from flashing a reduced state only to expand once the query resolves.
 */
export function useIsClubOperational(role: SystemRole): boolean | undefined {
  const { data } = useQuery({
    queryKey: CLUB_OPERATIONAL_STATUS_QUERY_KEY,
    queryFn: fetchClubOperationalStatus,
    enabled: role === "owner",
  });

  return data?.operational;
}

// A nav item plus whether it matches the current route — the one bit of
// per-item state that's genuinely shared between NavLinks and
// MobileBottomNav (each render list only differs in JSX/animation shell).
export type VisibleNavLink = NavItem & { active: boolean };

/**
 * Shared, non-presentational logic behind both nav renderers
 * (NavLinks/MobileBottomNav): which items are visible for this
 * role/admin/operational-status combination (see getVisibleNavItems), plus
 * whether each one matches the current pathname. Callers only need to map
 * over the result and render their own link/pill/tab shell.
 */
export function useVisibleNavLinks(
  role: SystemRole,
  isAdmin: boolean = false,
): VisibleNavLink[] {
  const pathname = usePathname();
  const isOperational = useIsClubOperational(role);
  const visibleItems = getVisibleNavItems(role, isOperational, isAdmin);

  return visibleItems.map((item) => ({
    ...item,
    active: pathname === item.href,
  }));
}

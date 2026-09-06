import type { SystemRole } from "@/providers/auth-provider";
import { navItems } from "./consts";
import type { NavItem } from "./consts";

export function getInitials(email: string | null): string {
  return email?.split("@")[0]?.[0]?.toUpperCase() ?? "U";
}

/**
 * Filters navItems by role (existing behavior), then — only for an owner
 * whose club is confirmedly non-operational (`isOperational === false`) —
 * narrows further to just the `essential` item(s) (Dashboard), since every
 * other owner-only page just renders the same ClubOperationalGate screen
 * anyway.
 *
 * `isOperational === undefined` (still loading) or `true` behaves exactly
 * like the plain role-only filter, so the nav never flashes items only to
 * hide them once the operational-status query resolves. Player-only items
 * are never affected — this branch only ever triggers for `role === "owner"`.
 *
 * `isAdmin` (default false) additionally gates any `adminOnly` item (e.g.
 * Audit Log) independent of `role` — an admin sees it regardless of their
 * own role, and a non-admin never sees it, including owners.
 *
 * `isAdmin` ALSO widens visibility for any `visibleToAdmin` item (e.g. Club
 * Settings) — opposite direction from `adminOnly`: an admin sees it in
 * addition to the normal role match, even when their own `role` isn't in
 * that item's `roles` (e.g. an admin whose role is "player" still sees the
 * owner-only Club Settings item). A non-admin is unaffected either way —
 * `roles` alone still decides visibility for them.
 */
export function getVisibleNavItems(
  role: SystemRole,
  isOperational: boolean | undefined,
  isAdmin: boolean = false,
): NavItem[] {
  const roleItems = navItems
    .filter((item) => item.roles.includes(role))
    .filter((item) => !item.adminOnly || isAdmin);

  // Only adds items the role-based filter above didn't already include —
  // an admin owner still sees Club Settings exactly once, at its normal
  // position in `navItems`, not duplicated at the end.
  const adminWidenedItems = isAdmin
    ? navItems.filter(
        (item) => item.visibleToAdmin && !item.roles.includes(role),
      )
    : [];

  const visibleItems = [...roleItems, ...adminWidenedItems];

  if (role === "owner" && isOperational === false) {
    return visibleItems.filter((item) => item.essential);
  }

  return visibleItems;
}

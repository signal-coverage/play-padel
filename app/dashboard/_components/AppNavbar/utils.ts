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
 */
export function getVisibleNavItems(
  role: SystemRole,
  isOperational: boolean | undefined,
): NavItem[] {
  const roleItems = navItems.filter((item) => item.roles.includes(role));

  if (role === "owner" && isOperational === false) {
    return roleItems.filter((item) => item.essential);
  }

  return roleItems;
}

import type { SystemRole } from "@/providers/auth-provider";
import { navItems } from "./consts";
import type { NavItem } from "./consts";
import type { VisibleNavLink } from "./hooks";

export function getInitials(email: string | null): string {
  return email?.split("@")[0]?.[0]?.toUpperCase() ?? "U";
}

/**
 * Filters navItems by role (existing behavior), then — for an owner whose
 * club isn't confirmed operational yet (`isOperational` is `false`, or still
 * `undefined` while the status query is in flight) — narrows further to just
 * the `essential` item(s) (Dashboard), since every other owner-only page
 * just renders the same ClubOperationalGate screen anyway.
 *
 * Only `isOperational === true` (confirmed operational) shows the full nav.
 * Treating the loading state the same as "not operational" means a non-
 * operational club's owner briefly sees the same reduced nav they'll end up
 * with anyway (no visible change once the query resolves), and an
 * operational club's owner sees the reduced nav for only the length of that
 * one request before it expands — the opposite default (assume operational
 * while loading) used to flash Courts/Reservations/Settings for a moment on
 * every non-operational club's dashboard, only to yank them away again once
 * the query resolved. Player-only items are never affected — this branch
 * only ever triggers for `role === "owner"`.
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
 *
 * `dynamicConditions` gates any `requiresCondition` item (e.g. Tournaments)
 * -- such an item is visible only when its named condition maps to exactly
 * `true` in this object. Omitted/undefined (the default) hides every such
 * item, same as an explicit `false` -- there's no "unknown -> visible"
 * state, unlike `isOperational`'s loading semantics above, since a missing
 * dynamic condition just means "not yet known to be open," which should
 * never flash the nav item on before quietly hiding it again.
 */
export function getVisibleNavItems(
  role: SystemRole,
  isOperational: boolean | undefined,
  isAdmin: boolean = false,
  dynamicConditions: Partial<
    Record<NonNullable<NavItem["requiresCondition"]>, boolean>
  > = {},
): NavItem[] {
  const passesDynamicCondition = (item: NavItem) =>
    !item.requiresCondition ||
    dynamicConditions[item.requiresCondition] === true;

  const roleItems = navItems
    .filter((item) => item.roles.includes(role))
    .filter((item) => !item.adminOnly || isAdmin)
    .filter(passesDynamicCondition);

  // Only adds items the role-based filter above didn't already include —
  // an admin owner still sees Club Settings exactly once, at its normal
  // position in `navItems`, not duplicated at the end.
  const adminWidenedItems = isAdmin
    ? navItems
        .filter((item) => item.visibleToAdmin && !item.roles.includes(role))
        .filter(passesDynamicCondition)
    : [];

  const visibleItems = [...roleItems, ...adminWidenedItems];

  if (role === "owner" && isOperational !== true) {
    return visibleItems.filter((item) => item.essential);
  }

  return visibleItems;
}

// Splits an already-visible nav link list into the ones rendered as their
// own top-level pill/tab ("items") versus the ones collapsed into a grouped
// dropdown ("adminItems", see NavGroupMenu) — NavItem's `group: "admin"`
// items, PLUS any item reached only via visibleToAdmin widening
// (`viaAdminWidening: true`, see useVisibleNavLinks), regardless of that
// item's own `.group` tag. Widening is itself the signal it's an admin tool
// for THIS viewer: an admin whose own role doesn't match (e.g. Club
// Settings for a player-role admin) has no Courts/Reservations to cluster
// it with as an ordinary tab, so grouping it with Audit Log/Search/etc.
// instead is what actually reduces pill count for them — a real owner who's
// also admin
// reaches the same item via the normal role match (viaAdminWidening: false)
// and keeps its own group untouched. Order within each partition is
// preserved.
export function partitionNavLinks(links: VisibleNavLink[]): {
  items: VisibleNavLink[];
  adminItems: VisibleNavLink[];
} {
  const items: VisibleNavLink[] = [];
  const adminItems: VisibleNavLink[] = [];
  for (const link of links) {
    (link.group === "admin" || link.viaAdminWidening ? adminItems : items).push(
      link,
    );
  }
  return { items, adminItems };
}

/**
 * Core, DOM-free overflow arithmetic behind useOverflowNav (see ./hooks) —
 * given each candidate item's real rendered width (leading-to-trailing
 * order), the actual space available for them, and the width the overflow
 * ("More") trigger itself would take, returns how many LEADING items fit.
 *
 * Two cases:
 * 1. Every item's combined width already fits `availableWidth` on its own —
 *    the trigger is never shown, so its width doesn't need to be reserved,
 *    and every item is visible (returns `itemWidths.length`).
 * 2. Otherwise, the trigger WILL be shown, so its width must be reserved
 *    up front — items are added one at a time, leading to trailing, until
 *    the next one (plus the reserved trigger) would no longer fit.
 *
 * Deliberately ignores individual item order beyond "leading items win" —
 * a later, narrower item is never pulled forward ahead of an earlier, wider
 * one that didn't fit, matching how a real toolbar reads left-to-right.
 */
export function computeVisibleCount(
  itemWidths: number[],
  availableWidth: number,
  moreTriggerWidth: number,
): number {
  const total = itemWidths.reduce((sum, width) => sum + width, 0);
  if (total <= availableWidth) return itemWidths.length;

  let used = 0;
  let count = 0;
  for (const width of itemWidths) {
    if (used + width + moreTriggerWidth > availableWidth) break;
    used += width;
    count += 1;
  }
  return count;
}

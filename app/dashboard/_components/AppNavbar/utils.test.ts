import { describe, expect, it } from "vitest";
import {
  getVisibleNavItems,
  partitionNavLinks,
  computeVisibleCount,
} from "./utils";
import { navItems } from "./consts";
import type { VisibleNavLink } from "./hooks";

const OWNER_ITEM_HREFS = navItems
  .filter((item) => item.roles.includes("owner") && !item.adminOnly)
  .filter((item) => !item.requiresCondition)
  .map((item) => item.href);

// Excludes requiresCondition items (e.g. Tournaments) — those are hidden by
// default unless the matching dynamicConditions entry is explicitly true,
// see the "dynamic-condition nav items" describe block below.
const PLAYER_ITEM_HREFS = navItems
  .filter((item) => item.roles.includes("player") && !item.adminOnly)
  .filter((item) => !item.requiresCondition)
  .map((item) => item.href);

describe("getVisibleNavItems", () => {
  it("shows only the essential (Dashboard) item while the operational status is still loading (undefined)", () => {
    const result = getVisibleNavItems("owner", undefined);
    expect(result.map((item) => item.href)).toEqual(["/dashboard"]);
  });

  it("shows the full owner nav when the club is operational", () => {
    const result = getVisibleNavItems("owner", true);
    expect(result.map((item) => item.href)).toEqual(OWNER_ITEM_HREFS);
  });

  it("shows only the essential (Dashboard) item when the club is confirmed non-operational", () => {
    const result = getVisibleNavItems("owner", false);
    expect(result.map((item) => item.href)).toEqual(["/dashboard"]);
  });

  it("never affects the player nav, regardless of the operational value", () => {
    expect(
      getVisibleNavItems("player", undefined).map((item) => item.href),
    ).toEqual(PLAYER_ITEM_HREFS);
    expect(getVisibleNavItems("player", true).map((item) => item.href)).toEqual(
      PLAYER_ITEM_HREFS,
    );
    expect(
      getVisibleNavItems("player", false).map((item) => item.href),
    ).toEqual(PLAYER_ITEM_HREFS);
  });

  // Audit Log is now admin-only technical tooling (see page.tsx's
  // AdminOnlyGuard) — an owner no longer sees it in the nav at all unless
  // they are ALSO an admin, independent of `role`.
  describe("admin-only nav items (e.g. Audit Log)", () => {
    it("hides the admin-only item for a non-admin owner by default", () => {
      const result = getVisibleNavItems("owner", true);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/audit-logs",
      );
    });

    it("hides the admin-only item for a non-admin owner when isAdmin is explicitly false", () => {
      const result = getVisibleNavItems("owner", true, false);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/audit-logs",
      );
    });

    it("shows the admin-only item for an admin owner, in its normal position", () => {
      const result = getVisibleNavItems("owner", true, true);
      // Overview/Audit Log/Search/etc.'s position in `navItems` (right after
      // Club Settings) is preserved — they're the last owner-role items in
      // the source array.
      expect(result.map((item) => item.href)).toEqual([
        ...OWNER_ITEM_HREFS,
        "/dashboard/admin-overview",
        "/dashboard/audit-logs",
        "/dashboard/admin-search",
        "/dashboard/admin-status",
        "/dashboard/admin-approvals",
      ]);
    });

    it("shows the admin-only item for an admin whose role is player", () => {
      const result = getVisibleNavItems("player", undefined, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/audit-logs",
      );
    });

    it("still hides the admin-only item for a non-admin owner even when the club is confirmed non-operational", () => {
      const result = getVisibleNavItems("owner", false, true);
      // Non-operational narrows to essential-only regardless of adminOnly.
      expect(result.map((item) => item.href)).toEqual(["/dashboard"]);
    });
  });

  // Overview (the former admin dashboard home, moved into the Admin
  // dropdown — see app/dashboard/admin-overview/page.tsx) is the first
  // adminOnly item in `navItems`, same narrowing semantics as the others.
  describe("admin-only Overview nav item", () => {
    it("hides Overview from a non-admin owner", () => {
      const result = getVisibleNavItems("owner", true);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/admin-overview",
      );
    });

    it("hides Overview from a non-admin player", () => {
      const result = getVisibleNavItems("player", undefined);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/admin-overview",
      );
    });

    it("shows Overview to an admin owner", () => {
      const result = getVisibleNavItems("owner", true, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/admin-overview",
      );
    });

    it("shows Overview to an admin whose role is player", () => {
      const result = getVisibleNavItems("player", undefined, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/admin-overview",
      );
    });
  });

  // Search is the second adminOnly item, added alongside Audit Log — same
  // narrowing semantics, exercised explicitly here rather than relying only
  // on the generic OWNER_ITEM_HREFS/PLAYER_ITEM_HREFS exclusion above.
  describe("admin-only Search nav item", () => {
    it("hides Search from a non-admin owner", () => {
      const result = getVisibleNavItems("owner", true);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/admin-search",
      );
    });

    it("hides Search from a non-admin player", () => {
      const result = getVisibleNavItems("player", undefined);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/admin-search",
      );
    });

    it("shows Search to an admin owner", () => {
      const result = getVisibleNavItems("owner", true, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/admin-search",
      );
    });

    it("shows Search to an admin whose role is player", () => {
      const result = getVisibleNavItems("player", undefined, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/admin-search",
      );
    });
  });

  // System Status is the third adminOnly item, added alongside Audit Log
  // and Search — same narrowing semantics.
  describe("admin-only System Status nav item", () => {
    it("hides System Status from a non-admin owner", () => {
      const result = getVisibleNavItems("owner", true);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/admin-status",
      );
    });

    it("hides System Status from a non-admin player", () => {
      const result = getVisibleNavItems("player", undefined);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/admin-status",
      );
    });

    it("shows System Status to an admin owner", () => {
      const result = getVisibleNavItems("owner", true, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/admin-status",
      );
    });

    it("shows System Status to an admin whose role is player", () => {
      const result = getVisibleNavItems("player", undefined, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/admin-status",
      );
    });
  });

  // Approvals is the fourth adminOnly item, added alongside Audit Log,
  // Search, and System Status — same narrowing semantics.
  describe("admin-only Approvals nav item", () => {
    it("hides Approvals from a non-admin owner", () => {
      const result = getVisibleNavItems("owner", true);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/admin-approvals",
      );
    });

    it("hides Approvals from a non-admin player", () => {
      const result = getVisibleNavItems("player", undefined);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/admin-approvals",
      );
    });

    it("shows Approvals to an admin owner", () => {
      const result = getVisibleNavItems("owner", true, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/admin-approvals",
      );
    });

    it("shows Approvals to an admin whose role is player", () => {
      const result = getVisibleNavItems("player", undefined, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/admin-approvals",
      );
    });
  });

  // Club Settings additionally sets `visibleToAdmin: true` (widening) while
  // keeping `roles: ["owner"]` unchanged — opposite semantics from
  // `adminOnly` (narrowing): a `visibleToAdmin` item is included for an admin
  // REGARDLESS of whether their own role matches `roles`, in addition to the
  // normal role-based match, never instead of it.
  describe("admin-widened nav items (e.g. Club Settings)", () => {
    it("shows Club Settings to an owner via the normal role match, independent of isAdmin", () => {
      const result = getVisibleNavItems("owner", true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/settings/club",
      );
    });

    it("hides Club Settings from a non-admin player (role match fails, and isAdmin is false)", () => {
      const result = getVisibleNavItems("player", undefined);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/settings/club",
      );
    });

    it("shows Club Settings to an admin whose role is player, via visibleToAdmin, despite no role match", () => {
      const result = getVisibleNavItems("player", undefined, true);
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/settings/club",
      );
    });

    it("does not duplicate Club Settings for an admin owner (already included by role match)", () => {
      const result = getVisibleNavItems("owner", true, true);
      expect(
        result.filter((item) => item.href === "/dashboard/settings/club"),
      ).toHaveLength(1);
    });

    it("never shows Club Settings to a non-admin, non-owner player", () => {
      const result = getVisibleNavItems("player", undefined, false);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/settings/club",
      );
    });
  });

  // Tournaments is the first requiresCondition item — gated on the
  // `dynamicConditions` map's "tournamentsOpen" entry being exactly true,
  // independent of role/adminOnly/operational filtering.
  describe("dynamic-condition nav items (e.g. Tournaments)", () => {
    it("hides Tournaments from the player nav when dynamicConditions is omitted", () => {
      const result = getVisibleNavItems("player", undefined);
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/tournaments-hub",
      );
    });

    it("hides Tournaments from the player nav when tournamentsOpen is false", () => {
      const result = getVisibleNavItems("player", undefined, false, {
        tournamentsOpen: false,
      });
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/tournaments-hub",
      );
    });

    it("shows Tournaments to the player nav when tournamentsOpen is true", () => {
      const result = getVisibleNavItems("player", undefined, false, {
        tournamentsOpen: true,
      });
      expect(result.map((item) => item.href)).toContain(
        "/dashboard/tournaments-hub",
      );
    });

    it("never shows Tournaments to an owner, even when tournamentsOpen is true", () => {
      const result = getVisibleNavItems("owner", true, false, {
        tournamentsOpen: true,
      });
      expect(result.map((item) => item.href)).not.toContain(
        "/dashboard/tournaments-hub",
      );
    });
  });
});

describe("computeVisibleCount", () => {
  it("returns every item when they all fit without needing the overflow trigger at all", () => {
    // 3 items @ 50px = 150px, well under 300px — no need to reserve room
    // for a "More" trigger since nothing overflows.
    expect(computeVisibleCount([50, 50, 50], 300, 80)).toBe(3);
  });

  it("returns every item when the total exactly equals the available width", () => {
    expect(computeVisibleCount([50, 50, 50], 150, 80)).toBe(3);
  });

  it("reserves room for the More trigger once items don't all fit, and fits as many leading items as possible", () => {
    // 4 items @ 50px = 200px > 180px available, so the trigger (30px) must
    // be reserved: 2 items (100px) + trigger (30px) = 130px fits in 180px;
    // a 3rd item would push it to 180px total... exactly at the boundary,
    // which should still fit (150 + 30 = 180 <= 180).
    expect(computeVisibleCount([50, 50, 50, 50], 180, 30)).toBe(3);
  });

  it("returns 0 when even a single item plus the trigger doesn't fit", () => {
    expect(computeVisibleCount([200, 200], 100, 30)).toBe(0);
  });

  it("returns 0 for an empty item list regardless of available width", () => {
    expect(computeVisibleCount([], 500, 30)).toBe(0);
  });

  it("only counts leading items — a later, narrower item never fits ahead of an earlier, wider one that didn't", () => {
    // First item alone (120px) doesn't leave room for the trigger in 100px,
    // so visibleCount stops at 0 even though the second item (10px) would
    // technically fit on its own.
    expect(computeVisibleCount([120, 10], 100, 30)).toBe(0);
  });
});

function link(overrides: Partial<VisibleNavLink>): VisibleNavLink {
  const base = navItems[0];
  return { ...base, active: false, viaAdminWidening: false, ...overrides };
}

describe("partitionNavLinks", () => {
  it('splits items with group: "admin" into adminItems, everything else into items', () => {
    const dashboard = link({ href: "/dashboard" });
    const auditLog = link({ href: "/dashboard/audit-logs", group: "admin" });
    const approvals = link({
      href: "/dashboard/admin-approvals",
      group: "admin",
    });

    const result = partitionNavLinks([dashboard, auditLog, approvals]);

    expect(result.items).toEqual([dashboard]);
    expect(result.adminItems).toEqual([auditLog, approvals]);
  });

  it("returns an empty adminItems array when nothing is grouped", () => {
    const dashboard = link({ href: "/dashboard" });

    const result = partitionNavLinks([dashboard]);

    expect(result.items).toEqual([dashboard]);
    expect(result.adminItems).toEqual([]);
  });

  it("preserves the original relative order within each partition", () => {
    const a = link({ href: "/a" });
    const auditLog = link({ href: "/dashboard/audit-logs", group: "admin" });
    const b = link({ href: "/b" });
    const approvals = link({
      href: "/dashboard/admin-approvals",
      group: "admin",
    });

    const result = partitionNavLinks([a, auditLog, b, approvals]);

    expect(result.items.map((i) => i.href)).toEqual(["/a", "/b"]);
    expect(result.adminItems.map((i) => i.href)).toEqual([
      "/dashboard/audit-logs",
      "/dashboard/admin-approvals",
    ]);
  });

  // An admin whose own role doesn't include "owner" only ever sees Club
  // Settings via visibleToAdmin widening (see getVisibleNavItems) — for
  // them it's genuinely an admin tool, so it belongs in the same Admin
  // dropdown as Audit Log/Search/System Status/Approvals even though it
  // carries no `group` tag of its own (the dynamic "More" overflow handles
  // it otherwise — see useOverflowNav in ./hooks). A real owner who is also
  // admin reaches Club Settings via the normal role match instead
  // (viaAdminWidening: false) and stays a plain overflow candidate — see
  // NavLinks.test.tsx's admin-widened describe block for the end-to-end
  // version of this.
  it("routes a viaAdminWidening item into adminItems even with no group tag of its own", () => {
    const dashboard = link({ href: "/dashboard" });
    const clubSettings = link({
      href: "/dashboard/settings/club",
      viaAdminWidening: true,
    });

    const result = partitionNavLinks([dashboard, clubSettings]);

    expect(result.items).toEqual([dashboard]);
    expect(result.adminItems).toEqual([clubSettings]);
  });

  it("keeps a role-matched (non-widened) ungrouped item out of adminItems", () => {
    const clubSettings = link({
      href: "/dashboard/settings/club",
      viaAdminWidening: false,
    });

    const result = partitionNavLinks([clubSettings]);

    expect(result.items).toEqual([clubSettings]);
    expect(result.adminItems).toEqual([]);
  });
});

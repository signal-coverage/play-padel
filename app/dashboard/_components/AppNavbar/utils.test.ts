import { describe, expect, it } from "vitest";
import { getVisibleNavItems } from "./utils";
import { navItems } from "./consts";

const OWNER_ITEM_HREFS = navItems
  .filter((item) => item.roles.includes("owner") && !item.adminOnly)
  .map((item) => item.href);

const PLAYER_ITEM_HREFS = navItems
  .filter((item) => item.roles.includes("player") && !item.adminOnly)
  .map((item) => item.href);

describe("getVisibleNavItems", () => {
  it("shows the full owner nav when the operational status is still loading (undefined)", () => {
    const result = getVisibleNavItems("owner", undefined);
    expect(result.map((item) => item.href)).toEqual(OWNER_ITEM_HREFS);
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
      // Audit Log and Search's position in `navItems` (right after Club
      // Settings) is preserved — they're the last owner-role items in the
      // source array.
      expect(result.map((item) => item.href)).toEqual([
        ...OWNER_ITEM_HREFS,
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
});

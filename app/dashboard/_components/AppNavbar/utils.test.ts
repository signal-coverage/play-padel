import { describe, expect, it } from "vitest";
import { getVisibleNavItems } from "./utils";
import { navItems } from "./consts";

const OWNER_ITEM_HREFS = navItems
  .filter((item) => item.roles.includes("owner"))
  .map((item) => item.href);

const PLAYER_ITEM_HREFS = navItems
  .filter((item) => item.roles.includes("player"))
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
});

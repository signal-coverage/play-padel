import { describe, expect, it } from "vitest";
import { filterClubs, sortClubs } from "./utils";
import type { ClubBrowseSummary } from "../../types";
import type { ClubSort } from "./utils";

function makeClub(overrides: Partial<ClubBrowseSummary>): ClubBrowseSummary {
  return {
    id: "1",
    name: "Test Club",
    email: "club@example.com",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    plan: "BASIC",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "owner-1",
    updatedBy: "owner-1",
    courtCount: 0,
    hasAvailabilityToday: true,
    availablePaymentMethods: [],
    bankTransferInfo: null,
    ...overrides,
  };
}

describe("filterClubs", () => {
  it("returns all clubs when the query is empty", () => {
    const clubs = [makeClub({ id: "1" }), makeClub({ id: "2" })];
    expect(filterClubs(clubs, "")).toHaveLength(2);
  });

  it("filters by name, case-insensitively", () => {
    const clubs = [
      makeClub({ id: "1", name: "Padel Norte" }),
      makeClub({ id: "2", name: "Sur Padel Club" }),
    ];
    const result = filterClubs(clubs, "norte");
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });
});

describe("sortClubs", () => {
  it("sorts by name ascending and descending", () => {
    const clubs = [
      makeClub({ id: "1", name: "Zeta" }),
      makeClub({ id: "2", name: "Alfa" }),
    ];
    const asc: ClubSort = { field: "name", direction: "asc" };
    expect(sortClubs(clubs, asc).map((c) => c.id)).toEqual(["2", "1"]);
    const desc: ClubSort = { field: "name", direction: "desc" };
    expect(sortClubs(clubs, desc).map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("sorts by courtCount ascending and descending", () => {
    const clubs = [
      makeClub({ id: "1", courtCount: 5 }),
      makeClub({ id: "2", courtCount: 2 }),
    ];
    const asc: ClubSort = { field: "courtCount", direction: "asc" };
    expect(sortClubs(clubs, asc).map((c) => c.id)).toEqual(["2", "1"]);
    const desc: ClubSort = { field: "courtCount", direction: "desc" };
    expect(sortClubs(clubs, desc).map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("always sinks unavailable clubs to the bottom, sorted by name", () => {
    const clubs = [
      makeClub({ id: "1", name: "Zeta", hasAvailabilityToday: false }),
      makeClub({ id: "2", name: "Alfa", hasAvailabilityToday: true }),
      makeClub({ id: "3", name: "Beta", hasAvailabilityToday: false }),
      makeClub({ id: "4", name: "Omega", hasAvailabilityToday: true }),
    ];
    // Available clubs (2, 4) sorted by the chosen field come first; the
    // unavailable ones (1, 3) always trail, alphabetically, regardless of
    // the chosen sort direction.
    const desc: ClubSort = { field: "name", direction: "desc" };
    expect(sortClubs(clubs, desc).map((c) => c.id)).toEqual([
      "4",
      "2",
      "3",
      "1",
    ]);
  });
});

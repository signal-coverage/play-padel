import { describe, expect, it } from "vitest";
import { filterCourts, sortCourts } from "./utils";
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";
import type { CourtFilters, CourtSort } from "./utils";

const NO_FILTERS: CourtFilters = {
  surface: "all",
  indoor: "all",
  color: "all",
};

function makeCourt(overrides: Partial<CourtColumn>): CourtColumn {
  return {
    id: "1",
    name: "Court 1",
    slots: [],
    ...overrides,
  };
}

describe("filterCourts", () => {
  it("returns all courts when no filters are applied", () => {
    const courts = [makeCourt({ id: "1" }), makeCourt({ id: "2" })];
    expect(filterCourts(courts, NO_FILTERS)).toHaveLength(2);
  });

  it("filters by exact surface value", () => {
    const courts = [
      makeCourt({ id: "1", surface: "clay" }),
      makeCourt({ id: "2", surface: "cristal" }),
    ];
    const result = filterCourts(courts, { ...NO_FILTERS, surface: "clay" });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });

  it("filters by indoor", () => {
    const courts = [
      makeCourt({ id: "1", indoor: true }),
      makeCourt({ id: "2", indoor: false }),
    ];
    const result = filterCourts(courts, { ...NO_FILTERS, indoor: "indoor" });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });

  it("filters by outdoor, treating an unset indoor as outdoor", () => {
    const courts = [
      makeCourt({ id: "1", indoor: true }),
      makeCourt({ id: "2" }),
    ];
    const result = filterCourts(courts, { ...NO_FILTERS, indoor: "outdoor" });
    expect(result.map((c) => c.id)).toEqual(["2"]);
  });

  it("filters by color", () => {
    const courts = [
      makeCourt({ id: "1", color: "#0000ff" }),
      makeCourt({ id: "2", color: "#ff0000" }),
    ];
    const result = filterCourts(courts, { ...NO_FILTERS, color: "#ff0000" });
    expect(result.map((c) => c.id)).toEqual(["2"]);
  });

  it("combines surface and indoor filters (AND logic)", () => {
    const courts = [
      makeCourt({ id: "1", surface: "clay", indoor: true }),
      makeCourt({ id: "2", surface: "clay", indoor: false }),
    ];
    const result = filterCourts(courts, {
      ...NO_FILTERS,
      surface: "clay",
      indoor: "indoor",
    });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });
});

describe("sortCourts", () => {
  it("sorts by name ascending and descending", () => {
    const courts = [
      makeCourt({ id: "1", name: "Zeta" }),
      makeCourt({ id: "2", name: "Alfa" }),
    ];
    const asc: CourtSort = { field: "name", direction: "asc" };
    expect(sortCourts(courts, asc).map((c) => c.id)).toEqual(["2", "1"]);
    const desc: CourtSort = { field: "name", direction: "desc" };
    expect(sortCourts(courts, desc).map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("sorts by surface, with unset surface always last regardless of direction", () => {
    const courts = [
      makeCourt({ id: "1", surface: "cristal" }),
      makeCourt({ id: "2" }),
      makeCourt({ id: "3", surface: "clay" }),
    ];
    const asc: CourtSort = { field: "surface", direction: "asc" };
    expect(sortCourts(courts, asc).map((c) => c.id)).toEqual(["3", "1", "2"]);
    const desc: CourtSort = { field: "surface", direction: "desc" };
    expect(sortCourts(courts, desc).map((c) => c.id)).toEqual(["1", "3", "2"]);
  });

  it("sorts by reservation fee, with unset fee always last regardless of direction", () => {
    const courts = [
      makeCourt({ id: "1", reservationFee: 5000 }),
      makeCourt({ id: "2" }),
      makeCourt({ id: "3", reservationFee: 2000 }),
    ];
    const asc: CourtSort = { field: "reservationFee", direction: "asc" };
    expect(sortCourts(courts, asc).map((c) => c.id)).toEqual(["3", "1", "2"]);
    const desc: CourtSort = { field: "reservationFee", direction: "desc" };
    expect(sortCourts(courts, desc).map((c) => c.id)).toEqual(["1", "3", "2"]);
  });
});

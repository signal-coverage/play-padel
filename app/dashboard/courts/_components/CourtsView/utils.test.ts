import { describe, expect, it } from "vitest";
import { availabilityRowsToEntries, buildAvailabilityRows } from "./utils";
import type { CourtAvailability } from "@/core/courts/types";

describe("buildAvailabilityRows", () => {
  it("marks a day active when a matching entry is present, regardless of any `active` field", () => {
    const rows = buildAvailabilityRows([
      { dayOfWeek: 1, startTime: "08:00", endTime: "20:00" },
    ]);

    expect(rows.find((row) => row.dayOfWeek === 1)).toEqual({
      dayOfWeek: 1,
      active: true,
      startTime: "08:00",
      endTime: "20:00",
    });
  });

  it("defaults an unset day to inactive with the 09:00-21:00 placeholder window", () => {
    const rows = buildAvailabilityRows([]);

    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({
      dayOfWeek: 0,
      active: false,
      startTime: "09:00",
      endTime: "21:00",
    });
  });

  it("still builds rows from CourtAvailability-shaped entries (extra fields ignored)", () => {
    const courtAvailability: CourtAvailability[] = [
      {
        id: "a1",
        courtId: "c1",
        dayOfWeek: 2,
        startTime: "10:00",
        endTime: "18:00",
        active: true,
        createdAt: new Date(),
      },
    ];
    const rows = buildAvailabilityRows(courtAvailability);

    expect(rows.find((row) => row.dayOfWeek === 2)).toMatchObject({
      active: true,
      startTime: "10:00",
      endTime: "18:00",
    });
  });
});

describe("availabilityRowsToEntries", () => {
  it("keeps only active rows and drops the active flag", () => {
    const entries = availabilityRowsToEntries([
      { dayOfWeek: 0, active: false, startTime: "09:00", endTime: "21:00" },
      { dayOfWeek: 1, active: true, startTime: "08:00", endTime: "20:00" },
    ]);

    expect(entries).toEqual([
      { dayOfWeek: 1, startTime: "08:00", endTime: "20:00" },
    ]);
  });
});

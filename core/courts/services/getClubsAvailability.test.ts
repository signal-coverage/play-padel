import { describe, expect, it, vi, beforeEach } from "vitest";
import { startOfDay, endOfDay, subDays, addDays } from "date-fns";

// courts.service.ts eagerly constructs a real Prisma/Neon client at import
// time — mock it so importing the module doesn't require a real
// DATABASE_URL (same pattern as hasAnyFreeSlot.test.ts and
// reservation-conflict.test.ts).
const {
  courtFindManyMock,
  availabilityFindManyMock,
  reservationFindManyMock,
  closureFindManyMock,
} = vi.hoisted(() => ({
  courtFindManyMock: vi.fn(),
  availabilityFindManyMock: vi.fn(),
  reservationFindManyMock: vi.fn(),
  closureFindManyMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    court: { findMany: courtFindManyMock },
    courtAvailability: { findMany: availabilityFindManyMock },
    reservation: { findMany: reservationFindManyMock },
    courtClosure: { findMany: closureFindManyMock },
  },
}));

import { getClubsAvailability } from "./courts.service";

// A fixed local date used across tests. Its actual day-of-week doesn't
// matter for correctness — availability fixtures below derive dayOfWeek
// from this same DATE, exactly like production code does via date.getDay().
const DATE = new Date(2026, 7, 17); // 2026-08-17, local midnight
const DAY_OF_WEEK = DATE.getDay();

/**
 * Minimal re-implementation of the subset of Prisma's `where` operators the
 * production queries use (equality, `in`, `lt`/`lte`/`gt`/`gte`, and a
 * top-level `NOT` block). Lets each mocked findMany genuinely evaluate the
 * same where-clause semantics getClubsAvailability constructs, so these
 * tests exercise the real query logic (including the lapsed-hold exception
 * and closure/reservation overlap rules) instead of just returning a canned
 * array regardless of what was asked for. Mirrors the approach in
 * reservation-conflict.test.ts.
 */
function fieldMatches(actual: unknown, condition: unknown): boolean {
  if (
    condition !== null &&
    typeof condition === "object" &&
    !(condition instanceof Date)
  ) {
    const cond = condition as Record<string, unknown>;
    const operatorCheckers: Record<string, () => boolean> = {
      in: () => (cond.in as unknown[]).includes(actual),
      lt: () => (actual as Date) < (cond.lt as Date),
      lte: () => (actual as Date) <= (cond.lte as Date),
      gt: () => (actual as Date) > (cond.gt as Date),
      gte: () => (actual as Date) >= (cond.gte as Date),
      not: () => actual !== cond.not,
    };
    const presentOperators = Object.keys(operatorCheckers).filter(
      (op) => op in cond,
    );
    if (presentOperators.length === 0) {
      throw new Error(`Unsupported where condition: ${JSON.stringify(cond)}`);
    }
    // A condition object can carry multiple operators on the same field
    // (e.g. `{ gte: start, lte: end }` for a date-range filter) — all of
    // them must hold for the record to match, not just the first one found.
    return presentOperators.every((op) => operatorCheckers[op]());
  }
  return actual === condition;
}

function matchesWhere(
  row: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  for (const [key, condition] of Object.entries(where)) {
    if (key === "NOT") {
      if (matchesWhere(row, condition as Record<string, unknown>)) {
        return false;
      }
      continue;
    }
    if (!fieldMatches(row[key], condition)) return false;
  }
  return true;
}

function fakeFindMany<T extends Record<string, unknown>>(fixtures: T[]) {
  return vi.fn((args: { where: Record<string, unknown> }) =>
    Promise.resolve(fixtures.filter((row) => matchesWhere(row, args.where))),
  );
}

function timeOnDate(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = startOfDay(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function makeCourt(overrides: {
  id: string;
  clubId: string;
  slotDurationMinutes?: number;
}) {
  return {
    id: overrides.id,
    clubId: overrides.clubId,
    deletedAt: null,
    active: true,
    slotDurationMinutes: overrides.slotDurationMinutes ?? 60,
  };
}

function makeAvailability(courtId: string, startTime: string, endTime: string) {
  return {
    courtId,
    dayOfWeek: DAY_OF_WEEK,
    startTime,
    endTime,
    active: true,
  };
}

function makeReservation(overrides: {
  id: string;
  courtId: string;
  status?: string;
  startTime: string;
  endTime: string;
  paymentExpiresAt?: Date | null;
  // Defaults to DATE — override to place a fixture on a different calendar
  // day, e.g. to prove the query's date-range filter excludes it.
  date?: Date;
}) {
  const day = overrides.date ?? DATE;
  return {
    id: overrides.id,
    courtId: overrides.courtId,
    status: overrides.status ?? "CONFIRMED",
    scheduledStart: timeOnDate(day, overrides.startTime),
    scheduledEnd: timeOnDate(day, overrides.endTime),
    paymentExpiresAt: overrides.paymentExpiresAt ?? null,
  };
}

function makeClosure(overrides: {
  courtId: string;
  startTime: string;
  endTime: string;
  reason?: string;
}) {
  return {
    courtId: overrides.courtId,
    cancelledAt: null,
    startsAt: timeOnDate(DATE, overrides.startTime),
    endsAt: timeOnDate(DATE, overrides.endTime),
    reason: overrides.reason ?? "maintenance",
  };
}

beforeEach(() => {
  courtFindManyMock.mockReset();
  availabilityFindManyMock.mockReset();
  reservationFindManyMock.mockReset();
  closureFindManyMock.mockReset();
});

describe("matchesWhere (test helper) — multi-operator conditions", () => {
  // Regression test for a bug in this file's own fieldMatches helper: a
  // condition object with two operators on the same field (e.g. the
  // reservation query's `scheduledStart: { gte, lte }`) was only ever
  // checked against whichever operator's `if` happened to come first in a
  // sequential if/return chain, silently ignoring the other bound — so a
  // record only outside the `gte` bound would still match. This test calls
  // the matcher directly (bypassing getClubsAvailability's own downstream
  // date-overlap arithmetic, which would mask the bug) to prove both
  // bounds are now genuinely ANDed together.
  it("rejects a record whose value is only within the lte bound but before the gte bound", () => {
    const outOfRangeReservation = makeReservation({
      id: "r-day-before",
      courtId: "court-1",
      startTime: "08:00",
      endTime: "09:00",
      date: subDays(DATE, 1),
    });

    const matches = matchesWhere(outOfRangeReservation, {
      scheduledStart: { gte: startOfDay(DATE), lte: endOfDay(DATE) },
    });

    expect(matches).toBe(false);
  });

  it("accepts a record whose value is within both the gte and lte bounds", () => {
    const inRangeReservation = makeReservation({
      id: "r-in-range",
      courtId: "court-1",
      startTime: "08:00",
      endTime: "09:00",
    });

    const matches = matchesWhere(inRangeReservation, {
      scheduledStart: { gte: startOfDay(DATE), lte: endOfDay(DATE) },
    });

    expect(matches).toBe(true);
  });
});

describe("getClubsAvailability", () => {
  it("marks a club as available when its one court has a free slot", async () => {
    courtFindManyMock.mockImplementation(
      fakeFindMany([makeCourt({ id: "court-1", clubId: "club-1" })]),
    );
    availabilityFindManyMock.mockImplementation(
      fakeFindMany([makeAvailability("court-1", "08:00", "10:00")]),
    );
    reservationFindManyMock.mockImplementation(fakeFindMany([]));
    closureFindManyMock.mockImplementation(fakeFindMany([]));

    const result = await getClubsAvailability(["club-1"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 1,
      hasAvailabilityToday: true,
    });
  });

  it("marks a club as unavailable when its only court is fully booked for every generated slot", async () => {
    courtFindManyMock.mockImplementation(
      fakeFindMany([makeCourt({ id: "court-1", clubId: "club-1" })]),
    );
    availabilityFindManyMock.mockImplementation(
      fakeFindMany([makeAvailability("court-1", "08:00", "10:00")]),
    );
    reservationFindManyMock.mockImplementation(
      fakeFindMany([
        makeReservation({
          id: "r1",
          courtId: "court-1",
          startTime: "08:00",
          endTime: "09:00",
        }),
        makeReservation({
          id: "r2",
          courtId: "court-1",
          startTime: "09:00",
          endTime: "10:00",
        }),
      ]),
    );
    closureFindManyMock.mockImplementation(fakeFindMany([]));

    const result = await getClubsAvailability(["club-1"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 1,
      hasAvailabilityToday: false,
    });
  });

  it("reports courtCount 0 and no availability for a club with zero active courts", async () => {
    courtFindManyMock.mockImplementation(fakeFindMany([]));

    const result = await getClubsAvailability(["club-1"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 0,
      hasAvailabilityToday: false,
    });
    // Short-circuit: no point querying availability/reservations/closures
    // when there are no active courts to evaluate.
    expect(availabilityFindManyMock).not.toHaveBeenCalled();
    expect(reservationFindManyMock).not.toHaveBeenCalled();
    expect(closureFindManyMock).not.toHaveBeenCalled();
  });

  it("partitions results per club without leaking availability across clubs", async () => {
    courtFindManyMock.mockImplementation(
      fakeFindMany([
        makeCourt({ id: "court-1", clubId: "club-1" }),
        makeCourt({ id: "court-2", clubId: "club-2" }),
      ]),
    );
    availabilityFindManyMock.mockImplementation(
      fakeFindMany([
        makeAvailability("court-1", "08:00", "10:00"),
        makeAvailability("court-2", "08:00", "10:00"),
      ]),
    );
    reservationFindManyMock.mockImplementation(
      fakeFindMany([
        // court-2 fully booked; court-1 left free.
        makeReservation({
          id: "r1",
          courtId: "court-2",
          startTime: "08:00",
          endTime: "10:00",
        }),
      ]),
    );
    closureFindManyMock.mockImplementation(fakeFindMany([]));

    const result = await getClubsAvailability(["club-1", "club-2"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 1,
      hasAvailabilityToday: true,
    });
    expect(result.get("club-2")).toEqual({
      courtCount: 1,
      hasAvailabilityToday: false,
    });
  });

  it("does not let a lapsed SCHEDULED (pending-payment) hold block a slot, matching getCourtSlots' exception", async () => {
    courtFindManyMock.mockImplementation(
      fakeFindMany([makeCourt({ id: "court-1", clubId: "club-1" })]),
    );
    availabilityFindManyMock.mockImplementation(
      fakeFindMany([makeAvailability("court-1", "08:00", "09:00")]),
    );
    reservationFindManyMock.mockImplementation(
      fakeFindMany([
        makeReservation({
          id: "r-lapsed",
          courtId: "court-1",
          status: "SCHEDULED",
          startTime: "08:00",
          endTime: "09:00",
          paymentExpiresAt: new Date(Date.now() - 60_000), // already expired
        }),
      ]),
    );
    closureFindManyMock.mockImplementation(fakeFindMany([]));

    const result = await getClubsAvailability(["club-1"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 1,
      hasAvailabilityToday: true,
    });
  });

  it("short-circuits per club, but still finds availability on a later court when an earlier court has none", async () => {
    courtFindManyMock.mockImplementation(
      fakeFindMany([
        // court-1a is listed first and is fully booked; court-1b is listed
        // second and has a free slot. This proves the per-club short-circuit
        // doesn't stop before evaluating a later court's real availability.
        makeCourt({ id: "court-1a", clubId: "club-1" }),
        makeCourt({ id: "court-1b", clubId: "club-1" }),
      ]),
    );
    availabilityFindManyMock.mockImplementation(
      fakeFindMany([
        makeAvailability("court-1a", "08:00", "09:00"),
        makeAvailability("court-1b", "08:00", "09:00"),
      ]),
    );
    reservationFindManyMock.mockImplementation(
      fakeFindMany([
        makeReservation({
          id: "r1",
          courtId: "court-1a",
          startTime: "08:00",
          endTime: "09:00",
        }),
        // court-1b has no reservation at all — its only slot is free.
      ]),
    );
    closureFindManyMock.mockImplementation(fakeFindMany([]));

    const result = await getClubsAvailability(["club-1"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 2,
      hasAvailabilityToday: true,
    });
  });

  it("still blocks a slot for a SCHEDULED (pending-payment) hold that has NOT expired yet", async () => {
    courtFindManyMock.mockImplementation(
      fakeFindMany([makeCourt({ id: "court-1", clubId: "club-1" })]),
    );
    availabilityFindManyMock.mockImplementation(
      fakeFindMany([makeAvailability("court-1", "08:00", "09:00")]),
    );
    reservationFindManyMock.mockImplementation(
      fakeFindMany([
        makeReservation({
          id: "r-pending",
          courtId: "court-1",
          status: "SCHEDULED",
          startTime: "08:00",
          endTime: "09:00",
          paymentExpiresAt: new Date(Date.now() + 60_000), // not expired yet
        }),
      ]),
    );
    closureFindManyMock.mockImplementation(fakeFindMany([]));

    const result = await getClubsAvailability(["club-1"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 1,
      hasAvailabilityToday: false,
    });
  });

  it("ignores a reservation on a different calendar day even though it shares the same clock time", async () => {
    courtFindManyMock.mockImplementation(
      fakeFindMany([makeCourt({ id: "court-1", clubId: "club-1" })]),
    );
    availabilityFindManyMock.mockImplementation(
      fakeFindMany([makeAvailability("court-1", "08:00", "09:00")]),
    );
    reservationFindManyMock.mockImplementation(
      fakeFindMany([
        // Same court and clock time as the queried slot, but the day
        // before DATE — outside the query's [startOfDay, endOfDay] range.
        // Before the fieldMatches fix, only the `lte` bound of the combined
        // `{ gte, lte }` condition on scheduledStart was ever enforced, so
        // this row would incorrectly match (its scheduledStart is still
        // <= endOfDay(DATE)) and wrongly block the slot.
        makeReservation({
          id: "r-day-before",
          courtId: "court-1",
          startTime: "08:00",
          endTime: "09:00",
          date: subDays(DATE, 1),
        }),
      ]),
    );
    closureFindManyMock.mockImplementation(fakeFindMany([]));

    const result = await getClubsAvailability(["club-1"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 1,
      hasAvailabilityToday: true,
    });
  });

  it("marks a slot unavailable when a closure overlaps it, even with no competing reservation", async () => {
    courtFindManyMock.mockImplementation(
      fakeFindMany([makeCourt({ id: "court-1", clubId: "club-1" })]),
    );
    availabilityFindManyMock.mockImplementation(
      fakeFindMany([makeAvailability("court-1", "08:00", "09:00")]),
    );
    reservationFindManyMock.mockImplementation(fakeFindMany([]));
    closureFindManyMock.mockImplementation(
      fakeFindMany([
        makeClosure({
          courtId: "court-1",
          startTime: "08:00",
          endTime: "09:00",
        }),
      ]),
    );

    const result = await getClubsAvailability(["club-1"], DATE);

    expect(result.get("club-1")).toEqual({
      courtCount: 1,
      hasAvailabilityToday: false,
    });
  });

  describe("overnight windows (endTime <= startTime, closes after midnight)", () => {
    it("marks a club as available for an overnight window whose free slots fall before and after midnight", async () => {
      courtFindManyMock.mockImplementation(
        fakeFindMany([makeCourt({ id: "court-1", clubId: "club-1" })]),
      );
      availabilityFindManyMock.mockImplementation(
        fakeFindMany([makeAvailability("court-1", "21:00", "02:00")]),
      );
      reservationFindManyMock.mockImplementation(fakeFindMany([]));
      closureFindManyMock.mockImplementation(fakeFindMany([]));

      const result = await getClubsAvailability(["club-1"], DATE);

      expect(result.get("club-1")).toEqual({
        courtCount: 1,
        hasAvailabilityToday: true,
      });
    });

    // This is the actual regression test for the widened query bound: a
    // reservation sitting entirely after midnight (on DATE + 1, between
    // 00:00 and 02:00) must still be picked up by the reservation.findMany
    // query and block those slots. Against the old `endOfDay(date)` upper
    // bound this reservation would silently fall outside the query result,
    // and the 00:00–01:00 / 01:00–02:00 slots would be wrongly reported as
    // free. Every other generated slot (21-22, 22-23, 23-00) is also booked
    // so the only way the club could end up "available" is if the
    // after-midnight reservation was missed.
    it("still blocks a slot for a reservation that falls after midnight, inside the overnight window", async () => {
      courtFindManyMock.mockImplementation(
        fakeFindMany([makeCourt({ id: "court-1", clubId: "club-1" })]),
      );
      availabilityFindManyMock.mockImplementation(
        fakeFindMany([makeAvailability("court-1", "21:00", "02:00")]),
      );
      reservationFindManyMock.mockImplementation(
        fakeFindMany([
          makeReservation({
            id: "r-evening",
            courtId: "court-1",
            startTime: "21:00",
            endTime: "23:00",
          }),
          {
            id: "r-crosses-midnight",
            courtId: "court-1",
            status: "CONFIRMED",
            scheduledStart: timeOnDate(DATE, "23:00"),
            scheduledEnd: timeOnDate(addDays(DATE, 1), "00:00"),
            paymentExpiresAt: null,
          },
          makeReservation({
            id: "r-after-midnight",
            courtId: "court-1",
            startTime: "00:00",
            endTime: "02:00",
            date: addDays(DATE, 1),
          }),
        ]),
      );
      closureFindManyMock.mockImplementation(fakeFindMany([]));

      const result = await getClubsAvailability(["club-1"], DATE);

      expect(result.get("club-1")).toEqual({
        courtCount: 1,
        hasAvailabilityToday: false,
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma client at the module boundary so these tests exercise the
// real overlap-detection query logic built in reservations.service.ts,
// without needing a live database (see docs/SECURITY.md: conflict validation
// is enforced server-side here, not just in the UI).
const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { findFirst: findFirstMock },
  },
}));

import {
  checkCourtConflict,
  checkUserOverlapConflict,
} from "@/core/reservations/services/reservations.service";

interface FixtureRow {
  id: string;
  clubId: string;
  courtId: string;
  userId: string;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  paymentExpiresAt: Date | null;
}

function makeRow(
  overrides: Partial<FixtureRow> &
    Pick<FixtureRow, "id" | "scheduledStart" | "scheduledEnd">,
): FixtureRow {
  return {
    clubId: "club-1",
    courtId: "court-1",
    userId: "user-1",
    status: "CONFIRMED",
    paymentExpiresAt: null,
    ...overrides,
  };
}

/**
 * Minimal re-implementation of the subset of Prisma's `where` operators used
 * by checkCourtConflict / checkUserOverlapConflict (equality, `in`, `lt`,
 * `gt`, `not`, and a top-level `NOT` block). This lets the fake `findFirst`
 * genuinely evaluate the same overlap semantics the service constructs
 * (rather than a canned true/false), so the boundary tests below actually
 * exercise that logic instead of just asserting on a mock's return value.
 */
function fieldMatches(actual: unknown, condition: unknown): boolean {
  if (
    condition !== null &&
    typeof condition === "object" &&
    !(condition instanceof Date)
  ) {
    const cond = condition as Record<string, unknown>;
    if ("in" in cond) return (cond.in as unknown[]).includes(actual);
    if ("lt" in cond) return (actual as Date) < (cond.lt as Date);
    if ("gt" in cond) return (actual as Date) > (cond.gt as Date);
    if ("not" in cond) return actual !== cond.not;
    throw new Error(`Unsupported where condition: ${JSON.stringify(cond)}`);
  }
  return actual === condition;
}

function matchesWhere(
  row: FixtureRow,
  where: Record<string, unknown>,
): boolean {
  for (const [key, condition] of Object.entries(where)) {
    if (key === "NOT") {
      if (matchesWhere(row, condition as Record<string, unknown>)) {
        return false;
      }
      continue;
    }
    if (
      !fieldMatches((row as unknown as Record<string, unknown>)[key], condition)
    ) {
      return false;
    }
  }
  return true;
}

function fakeFindFirst(fixtures: FixtureRow[]) {
  return vi.fn((args: { where: Record<string, unknown> }) => {
    const match = fixtures.find((row) => matchesWhere(row, args.where));
    return Promise.resolve(match ? { id: match.id } : null);
  });
}

beforeEach(() => {
  findFirstMock.mockReset();
});

describe("checkCourtConflict", () => {
  it("rejects a slot that overlaps an existing confirmed reservation", async () => {
    const existing = makeRow({
      id: "existing-1",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkCourtConflict({
      clubId: "club-1",
      courtId: "court-1",
      scheduledStart: new Date("2026-01-10T10:30:00Z"),
      scheduledEnd: new Date("2026-01-10T11:30:00Z"),
    });

    expect(conflict).toBe(true);
  });

  it("allows a slot that does not overlap any existing reservation", async () => {
    const existing = makeRow({
      id: "existing-1",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkCourtConflict({
      clubId: "club-1",
      courtId: "court-1",
      scheduledStart: new Date("2026-01-10T12:00:00Z"),
      scheduledEnd: new Date("2026-01-10T13:00:00Z"),
    });

    expect(conflict).toBe(false);
  });

  // Boundary case. The service's overlap where-clause is:
  //   scheduledStart: { lt: newEnd }, scheduledEnd: { gt: newStart }
  // Both comparisons are strict, so a reservation that ends exactly when the
  // next one starts does NOT count as a conflict — back-to-back bookings on
  // the same court are allowed.
  it("does NOT treat a reservation ending exactly when the new one starts as a conflict", async () => {
    const existing = makeRow({
      id: "existing-1",
      scheduledStart: new Date("2026-01-10T09:00:00Z"),
      scheduledEnd: new Date("2026-01-10T10:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkCourtConflict({
      clubId: "club-1",
      courtId: "court-1",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });

    expect(conflict).toBe(false);
  });

  it("does NOT treat a reservation starting exactly when the new one ends as a conflict", async () => {
    const existing = makeRow({
      id: "existing-1",
      scheduledStart: new Date("2026-01-10T11:00:00Z"),
      scheduledEnd: new Date("2026-01-10T12:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkCourtConflict({
      clubId: "club-1",
      courtId: "court-1",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });

    expect(conflict).toBe(false);
  });

  it("ignores a lapsed SCHEDULED (pending-payment) hold past its expiry", async () => {
    const lapsed = makeRow({
      id: "lapsed-1",
      status: "SCHEDULED",
      paymentExpiresAt: new Date(Date.now() - 60_000),
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([lapsed]));

    const conflict = await checkCourtConflict({
      clubId: "club-1",
      courtId: "court-1",
      scheduledStart: new Date("2026-01-10T10:30:00Z"),
      scheduledEnd: new Date("2026-01-10T11:30:00Z"),
    });

    expect(conflict).toBe(false);
  });

  it("still blocks on a SCHEDULED hold whose payment has not expired yet", async () => {
    const activeHold = makeRow({
      id: "hold-1",
      status: "SCHEDULED",
      paymentExpiresAt: new Date(Date.now() + 10 * 60_000),
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([activeHold]));

    const conflict = await checkCourtConflict({
      clubId: "club-1",
      courtId: "court-1",
      scheduledStart: new Date("2026-01-10T10:30:00Z"),
      scheduledEnd: new Date("2026-01-10T11:30:00Z"),
    });

    expect(conflict).toBe(true);
  });

  it("excludes the reservation being updated via excludeId", async () => {
    const existing = makeRow({
      id: "existing-1",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkCourtConflict({
      clubId: "club-1",
      courtId: "court-1",
      scheduledStart: new Date("2026-01-10T10:30:00Z"),
      scheduledEnd: new Date("2026-01-10T11:30:00Z"),
      excludeId: "existing-1",
    });

    expect(conflict).toBe(false);
  });
});

describe("checkUserOverlapConflict", () => {
  // MVP rule from reservations.service.ts: one active reservation per user
  // across ALL clubs, intentionally not scoped by clubId.
  it("rejects a user double-booking at a different club for an overlapping time", async () => {
    const existing = makeRow({
      id: "existing-1",
      clubId: "club-A",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkUserOverlapConflict({
      userId: "user-1",
      scheduledStart: new Date("2026-01-10T10:30:00Z"),
      scheduledEnd: new Date("2026-01-10T11:30:00Z"),
    });

    expect(conflict).toBe(true);
  });

  it("allows a non-overlapping booking for the same user", async () => {
    const existing = makeRow({
      id: "existing-1",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkUserOverlapConflict({
      userId: "user-1",
      scheduledStart: new Date("2026-01-10T12:00:00Z"),
      scheduledEnd: new Date("2026-01-10T13:00:00Z"),
    });

    expect(conflict).toBe(false);
  });

  it("does NOT treat a back-to-back booking (touching boundary) as a conflict", async () => {
    const existing = makeRow({
      id: "existing-1",
      scheduledStart: new Date("2026-01-10T09:00:00Z"),
      scheduledEnd: new Date("2026-01-10T10:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkUserOverlapConflict({
      userId: "user-1",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });

    expect(conflict).toBe(false);
  });

  it("ignores other users' overlapping reservations", async () => {
    const existing = makeRow({
      id: "existing-1",
      userId: "someone-else",
      scheduledStart: new Date("2026-01-10T10:00:00Z"),
      scheduledEnd: new Date("2026-01-10T11:00:00Z"),
    });
    findFirstMock.mockImplementation(fakeFindFirst([existing]));

    const conflict = await checkUserOverlapConflict({
      userId: "user-1",
      scheduledStart: new Date("2026-01-10T10:30:00Z"),
      scheduledEnd: new Date("2026-01-10T11:30:00Z"),
    });

    expect(conflict).toBe(false);
  });
});

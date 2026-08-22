import { describe, expect, it, vi, beforeEach } from "vitest";

// waitlist.service.ts eagerly imports the real Prisma/Neon client at module
// load time (same reason users.service.test.ts / hasAnyFreeSlot.test.ts need
// this) — mock it so importing the module for these tests doesn't require a
// real DATABASE_URL.
//
// Also mocks `userProfile.findUnique`: notifyWaitlistForSlot looks up the
// recipient's email/displayName before dispatching, mirroring the
// established pattern in reservations.service.ts's cancelReservation.
vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    waitlistEntry: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>mock</html>"),
}));

import { prisma } from "@/infrastructure/db/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { logAudit } from "@/core/audit/services/audit.service";
import {
  joinWaitlist,
  hasActiveWaitlistEntry,
  notifyWaitlistForSlot,
} from "./waitlist.service";

const upsertMock = prisma.waitlistEntry.upsert as ReturnType<typeof vi.fn>;
const findFirstMock = prisma.waitlistEntry.findFirst as ReturnType<
  typeof vi.fn
>;
const findManyMock = prisma.waitlistEntry.findMany as ReturnType<typeof vi.fn>;
const updateMock = prisma.waitlistEntry.update as ReturnType<typeof vi.fn>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;
const findUserMock = prisma.userProfile.findUnique as ReturnType<typeof vi.fn>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "wl_1",
    clubId: "club_1",
    courtId: "court_1",
    courtName: "Court 1",
    userId: "user_1",
    scheduledStart: new Date("2026-09-01T18:00:00"),
    scheduledEnd: new Date("2026-09-01T19:00:00"),
    status: "WAITING",
    notifiedAt: null,
    createdAt: new Date("2026-08-01T00:00:00"),
    updatedAt: new Date("2026-08-01T00:00:00"),
    ...overrides,
  };
}

describe("joinWaitlist", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the (courtId, scheduledStart, userId) unique key", async () => {
    upsertMock.mockResolvedValue(makeRow());

    await joinWaitlist({
      courtId: "court_1",
      courtName: "Court 1",
      clubId: "club_1",
      scheduledStart: new Date("2026-09-01T18:00:00"),
      scheduledEnd: new Date("2026-09-01T19:00:00"),
      userId: "user_1",
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0][0];
    expect(call.where).toEqual({
      courtId_scheduledStart_userId: {
        courtId: "court_1",
        scheduledStart: new Date("2026-09-01T18:00:00"),
        userId: "user_1",
      },
    });
  });

  it("resets an existing NOTIFIED row back to WAITING on the update branch", async () => {
    upsertMock.mockResolvedValue(makeRow());

    await joinWaitlist({
      courtId: "court_1",
      courtName: "Court 1",
      clubId: "club_1",
      scheduledStart: new Date("2026-09-01T18:00:00"),
      scheduledEnd: new Date("2026-09-01T19:00:00"),
      userId: "user_1",
    });

    const call = upsertMock.mock.calls[0][0];
    expect(call.update).toEqual({ status: "WAITING", notifiedAt: null });
  });
});

describe("hasActiveWaitlistEntry", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns true when a WAITING row exists", async () => {
    findFirstMock.mockResolvedValue(makeRow({ status: "WAITING" }));

    const result = await hasActiveWaitlistEntry(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      "user_1",
    );

    expect(result).toBe(true);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        courtId: "court_1",
        scheduledStart: new Date("2026-09-01T18:00:00"),
        userId: "user_1",
        status: "WAITING",
      },
    });
  });

  it("returns false when no row exists", async () => {
    findFirstMock.mockResolvedValue(null);

    const result = await hasActiveWaitlistEntry(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      "user_1",
    );

    expect(result).toBe(false);
  });
});

describe("notifyWaitlistForSlot", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset();
    dispatchMock.mockReset();
    findUserMock.mockReset();
    logAuditMock.mockReset();
    findUserMock.mockResolvedValue({
      email: "player@example.com",
      displayName: "Some Player",
    });
  });

  it("notifies every WAITING entry within the cancelled range and flips each to NOTIFIED", async () => {
    findManyMock.mockResolvedValue([
      makeRow({ id: "wl_1", userId: "user_1" }),
      makeRow({ id: "wl_2", userId: "user_2" }),
    ]);
    updateMock.mockResolvedValue(makeRow());

    await notifyWaitlistForSlot(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      new Date("2026-09-01T19:30:00"),
      "user_owner",
    );

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        courtId: "court_1",
        scheduledStart: {
          gte: new Date("2026-09-01T18:00:00"),
          lt: new Date("2026-09-01T19:30:00"),
        },
        status: "WAITING",
        userId: { not: "user_owner" },
      },
    });
    expect(dispatchMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledTimes(2);
    const updatedIds = updateMock.mock.calls.map((call) => call[0].where.id);
    expect(updatedIds).toEqual(expect.arrayContaining(["wl_1", "wl_2"]));
    expect(updateMock.mock.calls[0][0].data.status).toBe("NOTIFIED");
  });

  it("does not let one entry's dispatch failure stop the rest from being notified", async () => {
    findManyMock.mockResolvedValue([
      makeRow({ id: "wl_1", userId: "user_1" }),
      makeRow({ id: "wl_2", userId: "user_2" }),
    ]);
    dispatchMock.mockImplementation(
      async (payload: { recipientId: string }) => {
        if (payload.recipientId === "user_1") {
          throw new Error("boom");
        }
        return undefined;
      },
    );
    updateMock.mockResolvedValue(makeRow());

    await notifyWaitlistForSlot(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      new Date("2026-09-01T19:00:00"),
      "user_owner",
    );

    expect(dispatchMock).toHaveBeenCalledTimes(2);
    // The other entry must still be processed despite the first's failure —
    // entries run concurrently, so order is not guaranteed; assert by id.
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].where).toEqual({ id: "wl_2" });
  });

  it("processes entries concurrently rather than waiting for each in sequence", async () => {
    findManyMock.mockResolvedValue([
      makeRow({ id: "wl_1", userId: "user_1" }),
      makeRow({ id: "wl_2", userId: "user_2" }),
    ]);
    updateMock.mockResolvedValue(makeRow());

    let inFlight = 0;
    let maxInFlight = 0;
    dispatchMock.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      // Yield to the microtask queue so a sequential (awaited-in-order) loop
      // would resolve this before starting the next entry's dispatch call —
      // proving the entries are in flight at the same time.
      await Promise.resolve();
      inFlight -= 1;
      return undefined;
    });

    await notifyWaitlistForSlot(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      new Date("2026-09-01T19:00:00"),
      "user_owner",
    );

    expect(maxInFlight).toBeGreaterThan(1);
  });

  it("excludes only the entry matching excludeUserId, and still notifies a different-user entry", async () => {
    // Simulate real Prisma filtering by applying the where clause's
    // `userId: { not }` against a fixture that contains BOTH an entry
    // belonging to the excluded user (the player waitlisted on their own
    // cancelled reservation) and one belonging to someone else — proving the
    // filter excludes only the matching one, not everyone.
    const fixture = [
      makeRow({ id: "wl_self", userId: "user_1" }),
      makeRow({ id: "wl_other", userId: "user_2" }),
    ];
    findManyMock.mockImplementation(
      async ({ where }: { where: { userId: { not: string } } }) =>
        fixture.filter((row) => row.userId !== where.userId.not),
    );
    updateMock.mockResolvedValue(makeRow());

    await notifyWaitlistForSlot(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      new Date("2026-09-01T19:00:00"),
      "user_1",
    );

    // The excluded user's own entry (wl_self) must never be notified...
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    // ...while the different-user entry (wl_other) still is — proving the
    // filter is scoped to the one user, not accidentally excluding everyone.
    expect(updateMock.mock.calls[0][0].where).toEqual({ id: "wl_other" });
  });
});

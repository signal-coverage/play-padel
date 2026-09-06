import { describe, it, expect, vi, beforeEach } from "vitest";

// notifications.service.ts eagerly imports the real Prisma client at module
// load — mock it so importing the module doesn't require a real DATABASE_URL
// (same pattern as core/clubs/services/clubs.service.test.ts).
const {
  findManyMock,
  countMock,
  updateManyMock,
  userProfileFindManyMock,
  reservationFindManyMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  countMock: vi.fn(),
  updateManyMock: vi.fn(),
  userProfileFindManyMock: vi.fn(),
  reservationFindManyMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    notification: {
      findMany: findManyMock,
      count: countMock,
      updateMany: updateManyMock,
    },
    userProfile: {
      findMany: userProfileFindManyMock,
    },
    reservation: {
      findMany: reservationFindManyMock,
    },
  },
}));

import {
  listRecipientNotifications,
  countUnreadNotifications,
  markAllAsRead,
  listAdminRecipients,
  getPendingReservationReminders,
} from "./notifications.service";
// notifyAllAdmins lives in lib/notifications/dispatcher.ts, not here — see
// its own describe block in dispatcher.test.ts.

function makeNotificationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "notif_1",
    clubId: "club_1",
    type: "RESERVATION_REMINDER",
    recipientId: "user_1",
    recipientEmail: "user@example.com",
    title: "Title",
    message: "Message",
    status: "SENT",
    failureReason: null,
    sentAt: new Date("2026-09-01T00:00:00Z"),
    readAt: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

describe("listRecipientNotifications", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("queries notifications scoped to the recipient, newest first, capped at the given limit", async () => {
    findManyMock.mockResolvedValue([makeNotificationRow()]);

    await listRecipientNotifications("user_1", 10);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { recipientId: "user_1" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  });

  it("defaults the limit to 20 when not provided", async () => {
    findManyMock.mockResolvedValue([]);

    await listRecipientNotifications("user_1");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  it("maps rows through the Notification shape, including readAt and a possibly-null clubId", async () => {
    findManyMock.mockResolvedValue([
      makeNotificationRow({ clubId: null, readAt: null }),
    ]);

    const result = await listRecipientNotifications("user_1");

    expect(result).toEqual([
      expect.objectContaining({
        id: "notif_1",
        clubId: null,
        readAt: undefined,
      }),
    ]);
  });
});

describe("countUnreadNotifications", () => {
  beforeEach(() => {
    countMock.mockReset();
  });

  it("counts notifications for the recipient with readAt still null", async () => {
    countMock.mockResolvedValue(3);

    const result = await countUnreadNotifications("user_1");

    expect(countMock).toHaveBeenCalledWith({
      where: { recipientId: "user_1", readAt: null },
    });
    expect(result).toBe(3);
  });
});

describe("markAllAsRead", () => {
  beforeEach(() => {
    updateManyMock.mockReset();
  });

  it("sets readAt on every unread notification for the recipient", async () => {
    updateManyMock.mockResolvedValue({ count: 2 });

    await markAllAsRead("user_1");

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { recipientId: "user_1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe("listAdminRecipients", () => {
  beforeEach(() => {
    userProfileFindManyMock.mockReset();
  });

  it("queries every admin UserProfile, selecting only id/email/displayName", async () => {
    userProfileFindManyMock.mockResolvedValue([
      { id: "admin_1", email: "admin1@example.com", displayName: "Admin One" },
    ]);

    const result = await listAdminRecipients();

    expect(userProfileFindManyMock).toHaveBeenCalledWith({
      where: { isAdmin: true },
      select: { id: true, email: true, displayName: true },
    });
    expect(result).toEqual([
      { id: "admin_1", email: "admin1@example.com", displayName: "Admin One" },
    ]);
  });

  it("returns an empty array when there are no admins", async () => {
    userProfileFindManyMock.mockResolvedValue([]);

    const result = await listAdminRecipients();

    expect(result).toEqual([]);
  });
});

function makeReservationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    scheduledStart: new Date("2026-09-05T10:00:00Z"),
    courtName: "Court 1",
    user: { id: "user_1", email: "user@example.com", displayName: "User One" },
    ...overrides,
  };
}

describe("getPendingReservationReminders", () => {
  beforeEach(() => {
    reservationFindManyMock.mockReset();
    findManyMock.mockReset();
  });

  it("returns confirmed reservations in the reminder window with no existing SENT reminder today", async () => {
    reservationFindManyMock.mockResolvedValue([makeReservationRow()]);
    findManyMock.mockResolvedValue([]);

    const result = await getPendingReservationReminders(
      new Date("2026-09-05T00:00:00Z"),
    );

    expect(result).toEqual([
      {
        reservationId: "res_1",
        clubId: "club_1",
        userId: "user_1",
        userEmail: "user@example.com",
        userName: "User One",
        scheduledStart: new Date("2026-09-05T10:00:00Z"),
        courtName: "Court 1",
      },
    ]);
  });

  it("returns an empty array without querying notifications when there are no matching reservations", async () => {
    reservationFindManyMock.mockResolvedValue([]);

    const result = await getPendingReservationReminders();

    expect(result).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("excludes a reservation whose user already has a SENT reminder today for that clubId", async () => {
    reservationFindManyMock.mockResolvedValue([
      makeReservationRow({ id: "res_1", clubId: "club_1", userId: "user_1" }),
      makeReservationRow({ id: "res_2", clubId: "club_1", userId: "user_2" }),
    ]);
    findManyMock.mockResolvedValue([
      { recipientId: "user_1", clubId: "club_1" },
    ]);

    const result = await getPendingReservationReminders();

    expect(result).toEqual([
      expect.objectContaining({ reservationId: "res_2", userId: "user_2" }),
    ]);
  });

  it("does not exclude a reminder already sent for a different clubId (same user)", async () => {
    reservationFindManyMock.mockResolvedValue([
      makeReservationRow({ id: "res_1", clubId: "club_2", userId: "user_1" }),
    ]);
    findManyMock.mockResolvedValue([
      { recipientId: "user_1", clubId: "club_1" },
    ]);

    const result = await getPendingReservationReminders();

    expect(result).toEqual([
      expect.objectContaining({ reservationId: "res_1" }),
    ]);
  });

  it("computes the same-day dedupe boundary in Argentina time from the injected `now`, not the server's ambient timezone/clock", async () => {
    reservationFindManyMock.mockResolvedValue([makeReservationRow()]);
    findManyMock.mockResolvedValue([]);

    // 2026-09-06T02:30:00Z is 2026-09-05 23:30 in Argentina (UTC-3) — still
    // "today" (Sep 5) in Buenos Aires, even though the UTC calendar date has
    // already rolled over to Sep 6. A server running in UTC computing
    // `new Date(); setHours(0,0,0,0)` would wrongly use Sep 6 00:00 UTC as
    // the boundary here — 3 hours later than the real Sep 5 00:00 ARS
    // boundary (2026-09-05T03:00:00.000Z).
    await getPendingReservationReminders(new Date("2026-09-06T02:30:00.000Z"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: new Date("2026-09-05T03:00:00.000Z") },
        }),
      }),
    );
  });

  it("issues exactly ONE notification.findMany call regardless of how many reservations are checked (N+1 fix)", async () => {
    reservationFindManyMock.mockResolvedValue([
      makeReservationRow({ id: "res_1", userId: "user_1" }),
      makeReservationRow({ id: "res_2", userId: "user_2" }),
      makeReservationRow({ id: "res_3", userId: "user_3" }),
    ]);
    findManyMock.mockResolvedValue([]);

    await getPendingReservationReminders();

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        type: "RESERVATION_REMINDER",
        status: "SENT",
        createdAt: { gte: expect.any(Date) },
        recipientId: { in: ["user_1", "user_2", "user_3"] },
      },
      select: { recipientId: true, clubId: true },
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { update: vi.fn() },
    userProfile: { findUnique: vi.fn() },
    court: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/infrastructure/db/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { updateReservation } from "./reservations.service";

const updateMock = prisma.reservation.update as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;

function makeReservationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    userName: "Alex",
    courtId: "court_1",
    courtName: "Court 1",
    status: "SCHEDULED",
    scheduledStart: new Date("2026-09-01T18:00:00"),
    scheduledEnd: new Date("2026-09-01T19:00:00"),
    ...overrides,
  };
}

describe("updateReservation", () => {
  beforeEach(() => {
    updateMock.mockReset();
    findUniqueMock.mockReset();
    dispatchMock.mockReset();
    dispatchMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue(makeReservationRow());
    findUniqueMock.mockResolvedValue({
      email: "alex@example.com",
      displayName: "Alex",
    });
  });

  // The real gap reported: the player whose reservation the club just
  // rescheduled/reassigned had zero live signal — they'd only see the
  // change if they happened to reload My Reservations.
  it("notifies the reservation's owner in-app that it was updated", async () => {
    await updateReservation("club_1", "res_1", "owner_1", {
      scheduledStart: "2026-09-01T19:00:00",
    });

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RESERVATION_UPDATED",
        clubId: "club_1",
        recipientId: "user_1",
        recipientEmail: "alex@example.com",
        recipientName: "Alex",
        sendEmail: false,
      }),
    );
  });

  it("a notification-dispatch failure never blocks the reservation update from having already succeeded", async () => {
    dispatchMock.mockRejectedValue(new Error("resend is down"));

    await expect(
      updateReservation("club_1", "res_1", "owner_1", { notes: "updated" }),
    ).resolves.toBeDefined();
  });
});

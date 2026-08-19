import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { update: vi.fn() },
    userProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>mock</html>"),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/core/waitlist/services/waitlist.service", () => ({
  notifyWaitlistForSlot: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/infrastructure/db/client";
import { notifyWaitlistForSlot } from "@/core/waitlist/services/waitlist.service";
import { cancelReservation } from "./reservations.service";

const updateMock = prisma.reservation.update as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const notifyWaitlistMock = notifyWaitlistForSlot as ReturnType<typeof vi.fn>;

function makeReservationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    userName: "Alex",
    courtId: "court_1",
    courtName: "Court 1",
    status: "CANCELLED",
    scheduledStart: new Date("2026-09-01T18:00:00"),
    scheduledEnd: new Date("2026-09-01T19:00:00"),
    cancelledAt: new Date(),
    cancelledBy: "user_1",
    ...overrides,
  };
}

describe("cancelReservation", () => {
  beforeEach(() => {
    updateMock.mockReset();
    findUniqueMock.mockReset();
    notifyWaitlistMock.mockReset();
    updateMock.mockResolvedValue(makeReservationRow());
    findUniqueMock.mockResolvedValue({
      email: "alex@example.com",
      displayName: "Alex",
    });
  });

  it("notifies the waitlist for the cancelled reservation's full time range, excluding the canceller", async () => {
    await cancelReservation("res_1", "user_1");

    expect(notifyWaitlistMock).toHaveBeenCalledWith(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      new Date("2026-09-01T19:00:00"),
      "user_1",
    );
  });

  it("does not let a waitlist notification failure propagate out of cancelReservation", async () => {
    notifyWaitlistMock.mockRejectedValue(new Error("boom"));

    await expect(cancelReservation("res_1", "user_1")).resolves.toBeDefined();
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { update: vi.fn() },
    userProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { completeReservation } from "./reservations.service";

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
    status: "COMPLETED",
    scheduledStart: new Date("2026-09-01T18:00:00"),
    scheduledEnd: new Date("2026-09-01T19:00:00"),
    ...overrides,
  };
}

describe("completeReservation", () => {
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

  it("notifies the reservation's owner in-app that it was marked completed", async () => {
    await completeReservation("club_1", "res_1", "owner_1");

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RESERVATION_UPDATED",
        clubId: "club_1",
        recipientId: "user_1",
        sendEmail: false,
      }),
    );
  });
});

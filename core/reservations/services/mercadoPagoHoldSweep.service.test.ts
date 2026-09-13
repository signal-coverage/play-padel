import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  reservationFindManyMock,
  reservationUpdateMock,
  userProfileFindUniqueMock,
  dispatchMock,
} = vi.hoisted(() => ({
  reservationFindManyMock: vi.fn(),
  reservationUpdateMock: vi.fn(),
  userProfileFindUniqueMock: vi.fn(),
  dispatchMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: {
      findMany: reservationFindManyMock,
      update: reservationUpdateMock,
    },
    userProfile: {
      findUnique: userProfileFindUniqueMock,
    },
  },
}));
vi.mock("@/lib/notifications/dispatcher", () => ({ dispatch: dispatchMock }));

import { sweepLapsedMercadoPagoHolds } from "./mercadoPagoHoldSweep.service";
import { MP_HOLD_EXPIRY_ACTOR } from "@/core/reservations/consts";

describe("sweepLapsedMercadoPagoHolds", () => {
  beforeEach(() => {
    reservationFindManyMock.mockReset().mockResolvedValue([]);
    reservationUpdateMock.mockReset();
    userProfileFindUniqueMock.mockReset().mockResolvedValue({
      email: "user1@example.com",
      displayName: "Nico Sanchez",
    });
    dispatchMock.mockReset();
  });

  it("queries only lapsed, un-notified MERCADOPAGO holds", async () => {
    await sweepLapsedMercadoPagoHolds();

    expect(reservationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "SCHEDULED",
          paymentMethod: "MERCADOPAGO",
          paymentExpiresAt: expect.objectContaining({ lt: expect.any(Date) }),
          expiryNotifiedAt: null,
        }),
      }),
    );
  });

  it("emails the player once per lapsed hold and reports it in the notified count", async () => {
    reservationFindManyMock.mockResolvedValue([
      {
        id: "res-1",
        userId: "user-1",
        userName: "Nico Sanchez",
        courtName: "Court test 1",
        scheduledStart: new Date("2026-09-15T21:00:00Z"),
      },
    ]);

    const result = await sweepLapsedMercadoPagoHolds();

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RESERVATION_PAYMENT_HOLD_EXPIRED",
        recipientId: "user-1",
      }),
    );
    expect(result).toEqual({ notified: 1, failed: 0 });
  });

  it("cancels the hold and stamps expiryNotifiedAt in the same update", async () => {
    reservationFindManyMock.mockResolvedValue([
      {
        id: "res-1",
        userId: "user-1",
        userName: "Nico Sanchez",
        courtName: "Court test 1",
        scheduledStart: new Date("2026-09-15T21:00:00Z"),
      },
    ]);

    await sweepLapsedMercadoPagoHolds();

    expect(reservationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "res-1" },
        data: expect.objectContaining({
          status: "CANCELLED",
          cancelledBy: MP_HOLD_EXPIRY_ACTOR,
          updatedBy: MP_HOLD_EXPIRY_ACTOR,
          expiryNotifiedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("counts a failure without stopping the rest of the batch", async () => {
    reservationFindManyMock.mockResolvedValue([
      {
        id: "res-1",
        userId: "user-1",
        userName: "Nico Sanchez",
        courtName: "Court test 1",
        scheduledStart: new Date("2026-09-15T21:00:00Z"),
      },
      {
        id: "res-2",
        userId: "user-2",
        userName: "Jane Doe",
        courtName: "Court test 2",
        scheduledStart: new Date("2026-09-15T22:00:00Z"),
      },
    ]);
    dispatchMock
      .mockRejectedValueOnce(new Error("resend is down"))
      .mockResolvedValueOnce(undefined);

    const result = await sweepLapsedMercadoPagoHolds();

    expect(result).toEqual({ notified: 1, failed: 1 });
  });
});

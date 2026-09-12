import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { update: vi.fn() },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import { confirmReservationPayment } from "./reservations.service";

const reservationUpdateMock = prisma.reservation.update as ReturnType<
  typeof vi.fn
>;

describe("confirmReservationPayment — audit attribution", () => {
  beforeEach(() => {
    reservationUpdateMock.mockReset();
    reservationUpdateMock.mockResolvedValue({
      id: "res_1",
      clubId: "club_1",
      userId: "user_1",
      userName: "Player Name",
      courtId: "court_1",
      courtName: "Court 1",
      status: "CONFIRMED",
      scheduledStart: new Date(),
      scheduledEnd: new Date(),
      notes: null,
      paymentExpiresAt: null,
      paymentMethod: "TRANSFER",
      cancelledAt: null,
      cancelledBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user_1",
      updatedBy: "system:mercadopago-webhook",
    });
  });

  it("defaults updatedBy to system:mercadopago-webhook when called with no second argument (the real webhook call site)", async () => {
    await confirmReservationPayment("res_1");

    expect(reservationUpdateMock).toHaveBeenCalledWith({
      where: { id: "res_1" },
      data: {
        status: "CONFIRMED",
        updatedBy: "system:mercadopago-webhook",
      },
    });
  });

  it("records the real actor when an explicit updatedBy is passed (the confirmTransfer route call site)", async () => {
    await confirmReservationPayment("res_1", "owner_42");

    expect(reservationUpdateMock).toHaveBeenCalledWith({
      where: { id: "res_1" },
      data: {
        status: "CONFIRMED",
        updatedBy: "owner_42",
      },
    });
  });
});

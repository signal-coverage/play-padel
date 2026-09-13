import { describe, it, expect, vi, beforeEach } from "vitest";

// Same vi.hoisted convention as app/api/cron/bank-transfer-hold-sweep/route.test.ts
// — mock fns referenced inside a hoisted vi.mock factory must themselves be
// declared via vi.hoisted.
const {
  reservationFindManyMock,
  reservationFindUniqueMock,
  reservationUpdateMock,
} = vi.hoisted(() => ({
  reservationFindManyMock: vi.fn(),
  reservationFindUniqueMock: vi.fn(),
  reservationUpdateMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: {
      findMany: reservationFindManyMock,
      findUnique: reservationFindUniqueMock,
      update: reservationUpdateMock,
    },
  },
}));

import {
  listReservationsByUser,
  listReservationsByClub,
  listReservations,
  getReservation,
  confirmReservationPayment,
} from "./reservations.service";
import { MP_HOLD_EXPIRY_ACTOR } from "@/core/reservations/consts";

describe("confirmReservationPayment — audit attribution", () => {
  beforeEach(() => {
    reservationFindManyMock.mockReset();
    reservationFindUniqueMock.mockReset();
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

// A SCHEDULED Mercado Pago hold whose 15-minute window has already lapsed —
// the abandoned-checkout case this lazy-expiry mechanism targets.
function makeLapsedMpHoldRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    userName: "Nico Sanchez",
    courtId: "court_1",
    courtName: "Court 1",
    status: "SCHEDULED",
    scheduledStart: new Date("2026-09-15T21:00:00Z"),
    scheduledEnd: new Date("2026-09-15T22:30:00Z"),
    notes: null,
    paymentExpiresAt: new Date("2026-09-12T00:00:00Z"), // in the past
    paymentMethod: "MERCADOPAGO",
    expiryNotifiedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: new Date("2026-09-12T00:00:00Z"),
    updatedAt: new Date("2026-09-12T00:00:00Z"),
    createdBy: "user_1",
    updatedBy: "user_1",
    ...overrides,
  };
}

describe("reservations.service — lazy expiry of lapsed Mercado Pago holds", () => {
  beforeEach(() => {
    reservationFindManyMock.mockReset();
    reservationFindUniqueMock.mockReset();
    reservationUpdateMock.mockReset();
  });

  describe("listReservationsByUser", () => {
    it("transitions a lapsed unpaid MERCADOPAGO hold to CANCELLED and returns it as CANCELLED", async () => {
      const row = makeLapsedMpHoldRow();
      reservationFindManyMock.mockResolvedValue([row]);
      reservationUpdateMock.mockResolvedValue({
        ...row,
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: MP_HOLD_EXPIRY_ACTOR,
        updatedBy: MP_HOLD_EXPIRY_ACTOR,
      });

      const result = await listReservationsByUser("user_1", {
        includePast: true,
      });

      expect(reservationUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "res_1" },
          data: expect.objectContaining({
            status: "CANCELLED",
            cancelledBy: MP_HOLD_EXPIRY_ACTOR,
            updatedBy: MP_HOLD_EXPIRY_ACTOR,
          }),
        }),
      );
      expect(result[0].status).toBe("CANCELLED");
    });

    it("does not touch a SCHEDULED TRANSFER hold past its expiry (bank-transfer flow is untouched)", async () => {
      const row = makeLapsedMpHoldRow({ paymentMethod: "TRANSFER" });
      reservationFindManyMock.mockResolvedValue([row]);

      const result = await listReservationsByUser("user_1", {
        includePast: true,
      });

      expect(reservationUpdateMock).not.toHaveBeenCalled();
      expect(result[0].status).toBe("SCHEDULED");
    });

    it("does not touch a MERCADOPAGO hold that has not expired yet", async () => {
      const row = makeLapsedMpHoldRow({
        paymentExpiresAt: new Date(Date.now() + 60_000),
      });
      reservationFindManyMock.mockResolvedValue([row]);

      await listReservationsByUser("user_1", { includePast: true });

      expect(reservationUpdateMock).not.toHaveBeenCalled();
    });

    it("does not touch an already-CONFIRMED reservation", async () => {
      const row = makeLapsedMpHoldRow({ status: "CONFIRMED" });
      reservationFindManyMock.mockResolvedValue([row]);

      await listReservationsByUser("user_1", { includePast: true });

      expect(reservationUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe("listReservationsByClub (owner dashboard)", () => {
    it("also lazily expires a lapsed MERCADOPAGO hold", async () => {
      const row = makeLapsedMpHoldRow();
      reservationFindManyMock.mockResolvedValue([row]);
      reservationUpdateMock.mockResolvedValue({
        ...row,
        status: "CANCELLED",
      });

      const result = await listReservationsByClub("club_1", {
        status: ["SCHEDULED", "CONFIRMED", "CANCELLED"],
      });

      expect(reservationUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "res_1" } }),
      );
      expect(result[0].status).toBe("CANCELLED");
    });
  });

  describe("listReservations (owner reservations table, filtered)", () => {
    it("also lazily expires a lapsed MERCADOPAGO hold", async () => {
      const row = makeLapsedMpHoldRow();
      reservationFindManyMock.mockResolvedValue([row]);
      reservationUpdateMock.mockResolvedValue({ ...row, status: "CANCELLED" });

      const result = await listReservations("club_1", {});

      expect(reservationUpdateMock).toHaveBeenCalled();
      expect(result[0].status).toBe("CANCELLED");
    });
  });

  describe("getReservation (owner detail view)", () => {
    it("also lazily expires a lapsed MERCADOPAGO hold", async () => {
      const row = makeLapsedMpHoldRow();
      reservationFindUniqueMock.mockResolvedValue(row);
      reservationUpdateMock.mockResolvedValue({ ...row, status: "CANCELLED" });

      const result = await getReservation("club_1", "res_1");

      expect(reservationUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "res_1" } }),
      );
      expect(result?.status).toBe("CANCELLED");
    });

    it("returns null unaffected when the reservation doesn't exist", async () => {
      reservationFindUniqueMock.mockResolvedValue(null);
      const result = await getReservation("club_1", "missing");
      expect(result).toBeNull();
      expect(reservationUpdateMock).not.toHaveBeenCalled();
    });
  });
});

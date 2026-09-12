import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  courtFindUniqueMock,
  userFindUniqueMock,
  userFindManyMock,
  reservationFindFirstMock,
  courtClosureFindFirstMock,
  reservationCreateMock,
  reservationPartnerCreateManyMock,
} = vi.hoisted(() => ({
  courtFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userFindManyMock: vi.fn(),
  reservationFindFirstMock: vi.fn(),
  courtClosureFindFirstMock: vi.fn(),
  reservationCreateMock: vi.fn(),
  reservationPartnerCreateManyMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    court: { findUnique: courtFindUniqueMock },
    userProfile: { findUnique: userFindUniqueMock, findMany: userFindManyMock },
    reservation: {
      findFirst: reservationFindFirstMock,
      create: reservationCreateMock,
    },
    courtClosure: { findFirst: courtClosureFindFirstMock },
    reservationPartner: { createMany: reservationPartnerCreateManyMock },
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { createReservation } from "@/core/reservations/services/reservations.service";

const INPUT = {
  userId: "user_1",
  courtId: "court_1",
  scheduledStart: "2027-01-01T10:00:00.000Z",
  scheduledEnd: "2027-01-01T11:00:00.000Z",
};

function baseReservationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    userName: "Player One",
    courtId: "court_1",
    courtName: "Court 1",
    status: "CONFIRMED",
    scheduledStart: new Date(INPUT.scheduledStart),
    scheduledEnd: new Date(INPUT.scheduledEnd),
    notes: null,
    paymentExpiresAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "user_1",
    updatedBy: "user_1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  courtFindUniqueMock.mockResolvedValue({
    id: "court_1",
    clubId: "club_1",
    name: "Court 1",
  });
  userFindUniqueMock.mockResolvedValue({ displayName: "Player One" });
  reservationFindFirstMock.mockResolvedValue(null);
  courtClosureFindFirstMock.mockResolvedValue(null);
  reservationCreateMock.mockResolvedValue(baseReservationRow());
});

describe("createReservation — no partnerIds (existing behavior)", () => {
  it("never touches userProfile.findMany or reservationPartner.createMany when partnerIds is omitted", async () => {
    const result = await createReservation("user_1", INPUT);

    expect(result.id).toBe("res_1");
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(reservationPartnerCreateManyMock).not.toHaveBeenCalled();
  });
});

describe("createReservation — with partnerIds", () => {
  it("rejects with a validation error and never creates the reservation when a partner id is invalid", async () => {
    userFindManyMock.mockResolvedValue([]); // "partner_x" doesn't exist

    await expect(
      createReservation("user_1", { ...INPUT, partnerIds: ["partner_x"] }),
    ).rejects.toThrow("could not be found");

    expect(reservationCreateMock).not.toHaveBeenCalled();
  });

  it("rejects when the booker tries to tag themselves, before creating the reservation", async () => {
    await expect(
      createReservation("user_1", { ...INPUT, partnerIds: ["user_1"] }),
    ).rejects.toThrow("tag yourself");

    expect(reservationCreateMock).not.toHaveBeenCalled();
  });

  it("creates the reservation and tags the validated partners", async () => {
    userFindManyMock.mockResolvedValue([
      { id: "partner_1" },
      { id: "partner_2" },
    ]);

    const result = await createReservation("user_1", {
      ...INPUT,
      partnerIds: ["partner_1", "partner_2"],
    });

    expect(result.id).toBe("res_1");
    expect(reservationCreateMock).toHaveBeenCalled();
    expect(reservationPartnerCreateManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { reservationId: "res_1", playerId: "partner_1" },
        { reservationId: "res_1", playerId: "partner_2" },
      ]),
      skipDuplicates: true,
    });
  });

  it("still returns the created reservation even if tagging partners afterwards fails", async () => {
    userFindManyMock.mockResolvedValue([{ id: "partner_1" }]);
    reservationPartnerCreateManyMock.mockRejectedValue(new Error("db down"));

    const result = await createReservation("user_1", {
      ...INPUT,
      partnerIds: ["partner_1"],
    });

    expect(result.id).toBe("res_1");
  });
});

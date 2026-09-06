import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  courtFindUniqueMock,
  userFindUniqueMock,
  reservationFindFirstMock,
  courtClosureFindFirstMock,
  reservationCreateMock,
} = vi.hoisted(() => ({
  courtFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  reservationFindFirstMock: vi.fn(),
  courtClosureFindFirstMock: vi.fn(),
  reservationCreateMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    court: { findUnique: courtFindUniqueMock },
    userProfile: { findUnique: userFindUniqueMock },
    reservation: {
      findFirst: reservationFindFirstMock,
      create: reservationCreateMock,
    },
    courtClosure: { findFirst: courtClosureFindFirstMock },
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { Prisma } from "@/lib/generated/prisma/client";
import { createReservation } from "@/core/reservations/services/reservations.service";

// Real shape verified against the actual dev database (Postgres 23P01
// exclusion_violation via the "reservations_no_overlapping_confirmed"
// EXCLUDE constraint, Prisma 7.9.1 + @prisma/adapter-neon) — not guessed.
function makeExclusionViolationError() {
  return new Prisma.PrismaClientKnownRequestError(
    'Database error. Code: `23P01`. Message: `conflicting key value violates exclusion constraint "reservations_no_overlapping_confirmed"`',
    {
      code: "P2039",
      clientVersion: "7.9.1",
      meta: {
        modelName: "Reservation",
        driverAdapterError: {
          name: "DriverAdapterError",
          cause: {
            originalCode: "23P01",
            code: "23P01",
            kind: "postgres",
          },
        },
      },
    },
  );
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
});

const INPUT = {
  userId: "user_1",
  courtId: "court_1",
  scheduledStart: "2027-01-01T10:00:00.000Z",
  scheduledEnd: "2027-01-01T11:00:00.000Z",
};

describe("createReservation — DB-level double-booking backstop", () => {
  it("translates a real exclusion-constraint violation into the same friendly message the app-level conflict check uses", async () => {
    reservationCreateMock.mockRejectedValue(makeExclusionViolationError());

    await expect(createReservation("user_1", INPUT)).rejects.toThrow(
      "This slot is no longer available. Pick another time.",
    );
  });

  it("rethrows an unrelated database error unchanged (not misclassified as a booking conflict)", async () => {
    const unrelatedError = new Error("connection terminated unexpectedly");
    reservationCreateMock.mockRejectedValue(unrelatedError);

    await expect(createReservation("user_1", INPUT)).rejects.toThrow(
      "connection terminated unexpectedly",
    );
  });

  it("still creates the reservation normally when there's no conflict", async () => {
    reservationCreateMock.mockResolvedValue({
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
    });

    const result = await createReservation("user_1", INPUT);
    expect(result.id).toBe("res_1");
  });
});

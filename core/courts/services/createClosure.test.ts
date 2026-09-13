import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  reservationFindManyMock,
  courtClosureCreateMock,
  userProfileFindUniqueMock,
  transactionMock,
} = vi.hoisted(() => ({
  reservationFindManyMock: vi.fn(),
  courtClosureCreateMock: vi.fn(),
  userProfileFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { findMany: reservationFindManyMock },
    courtClosure: { create: courtClosureCreateMock },
    userProfile: { findUnique: userProfileFindUniqueMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/infrastructure/db/client";
import { createClosure } from "./courts.service";

const INPUT = {
  startsAt: "2026-09-20T10:00:00.000Z",
  endsAt: "2026-09-20T12:00:00.000Z",
  reason: "Maintenance",
};

const CLOSURE_ROW = {
  id: "closure_1",
  courtId: "court_1",
  startsAt: new Date(INPUT.startsAt),
  endsAt: new Date(INPUT.endsAt),
  reason: "Maintenance",
  createdAt: new Date(),
  createdBy: "owner_1",
  cancelledAt: null,
  cancelledBy: null,
};

beforeEach(() => {
  reservationFindManyMock.mockReset();
  courtClosureCreateMock.mockReset();
  userProfileFindUniqueMock.mockReset();
  transactionMock.mockReset();

  reservationFindManyMock.mockResolvedValue([]);
  courtClosureCreateMock.mockResolvedValue(CLOSURE_ROW);
  userProfileFindUniqueMock.mockResolvedValue({ displayName: "Owner One" });
  // The real interactive transaction's `tx` client is just `prisma` itself
  // here, so every mock above (reservationFindManyMock,
  // courtClosureCreateMock) is exercised exactly as in production — just
  // without a real DB enforcing serializable isolation.
  transactionMock.mockImplementation((cb: (tx: typeof prisma) => unknown) =>
    cb(prisma),
  );
});

// Closes the reservation-vs-closure TOCTOU within createClosure's own
// check-then-write: the active-reservation conflict check and the
// CourtClosure write now run inside one serializable transaction, mirroring
// createReservation's own closure-check/create atomicity (see
// core/reservations/services/reservations.service.ts) — its mirror-image
// counterpart against this exact pair of tables. A concurrent
// createReservation that writes a conflicting Reservation row either commits
// before this transaction's conflict check sees it, or loses a Postgres
// serialization conflict to it — never silently interleaves.
describe("createClosure — reservation-check/create atomicity", () => {
  it("runs the conflict check and the closure write inside one serializable transaction", async () => {
    await createClosure("club_1", "court_1", INPUT, "owner_1");

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
    expect(reservationFindManyMock).toHaveBeenCalled();
    expect(courtClosureCreateMock).toHaveBeenCalled();
  });

  it("does not create the closure when the transaction's own conflict check finds an active reservation", async () => {
    reservationFindManyMock.mockResolvedValue([
      {
        scheduledStart: new Date("2026-09-20T10:30:00.000Z"),
        scheduledEnd: new Date("2026-09-20T11:30:00.000Z"),
      },
    ]);

    await expect(
      createClosure("club_1", "court_1", INPUT, "owner_1"),
    ).rejects.toThrow(/overlaps 1 active reservation/);
    expect(courtClosureCreateMock).not.toHaveBeenCalled();
  });

  it("translates a serialization failure (Postgres could not prove the transaction was safe against a concurrent createReservation) into a friendly conflict message", async () => {
    transactionMock.mockImplementation(async () => {
      throw new Prisma.PrismaClientKnownRequestError(
        "Transaction failed due to a write conflict or a deadlock. Please retry your transaction",
        { code: "P2034", clientVersion: "7.9.1" },
      );
    });

    await expect(
      createClosure("club_1", "court_1", INPUT, "owner_1"),
    ).rejects.toThrow(
      "This closure conflicts with a reservation change made at the same time. Please retry.",
    );
  });
});

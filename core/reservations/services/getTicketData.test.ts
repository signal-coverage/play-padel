import { describe, it, expect, vi, beforeEach } from "vitest";

// getTicketData only touches prisma.reservation.findUnique — mock just that,
// mirroring reservation-conflict.test.ts's narrow-mock convention (the other
// top-level imports in reservations.service.ts have no import-time side
// effects that require mocking).
vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import { getTicketData } from "./reservations.service";

const findUniqueMock = prisma.reservation.findUnique as ReturnType<
  typeof vi.fn
>;

function makeReservationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    userName: "Alex",
    courtId: "court_1",
    courtName: "Court 1",
    status: "CONFIRMED",
    scheduledStart: new Date("2026-09-01T18:00:00"),
    scheduledEnd: new Date("2026-09-01T19:00:00"),
    club: { id: "club_1", name: "Padel Club" },
    ...overrides,
  };
}

describe("getTicketData", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the ticket shape for a CONFIRMED reservation", async () => {
    findUniqueMock.mockResolvedValue(makeReservationRow());

    const result = await getTicketData("res_1");

    expect(result).toEqual({
      id: "res_1",
      clubName: "Padel Club",
      courtName: "Court 1",
      scheduledStart: new Date("2026-09-01T18:00:00"),
      scheduledEnd: new Date("2026-09-01T19:00:00"),
      userName: "Alex",
      status: "CONFIRMED",
    });
  });

  it("returns null for a non-confirmed reservation (e.g. SCHEDULED)", async () => {
    findUniqueMock.mockResolvedValue(
      makeReservationRow({ status: "SCHEDULED" }),
    );

    expect(await getTicketData("res_1")).toBeNull();
  });

  it("returns null for a cancelled reservation", async () => {
    findUniqueMock.mockResolvedValue(
      makeReservationRow({ status: "CANCELLED" }),
    );

    expect(await getTicketData("res_1")).toBeNull();
  });

  it("returns null for an unknown reservation id", async () => {
    findUniqueMock.mockResolvedValue(null);

    expect(await getTicketData("unknown")).toBeNull();
  });
});

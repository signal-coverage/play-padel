import { describe, it, expect, vi, beforeEach } from "vitest";

// courts.service.ts eagerly constructs a real Prisma/Neon client at import
// time — mock it so importing the module doesn't require a real
// DATABASE_URL (same pattern as listCourtsByClub.test.ts).
const { courtClosureFindManyMock } = vi.hoisted(() => ({
  courtClosureFindManyMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: { courtClosure: { findMany: courtClosureFindManyMock } },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { listClosuresByClub } from "./courts.service";

describe("listClosuresByClub", () => {
  beforeEach(() => {
    courtClosureFindManyMock.mockReset();
  });

  it("scopes the query to courts belonging to the given club", async () => {
    courtClosureFindManyMock.mockResolvedValue([]);

    await listClosuresByClub("club_1");

    expect(courtClosureFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { court: { clubId: "club_1" } },
      }),
    );
  });

  it("orders results by most recently starting first", async () => {
    courtClosureFindManyMock.mockResolvedValue([]);

    await listClosuresByClub("club_1");

    expect(courtClosureFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { startsAt: "desc" },
      }),
    );
  });

  it("maps each row into a CourtClosure plus the owning court's name", async () => {
    const startsAt = new Date("2026-10-01T10:00:00.000Z");
    const endsAt = new Date("2026-10-01T18:00:00.000Z");
    const createdAt = new Date("2026-09-15T00:00:00.000Z");
    courtClosureFindManyMock.mockResolvedValue([
      {
        id: "closure_1",
        courtId: "court_1",
        startsAt,
        endsAt,
        reason: "Club rented for a tournament",
        createdAt,
        createdBy: "user_1",
        cancelledAt: null,
        cancelledBy: null,
        court: { name: "Court 1" },
      },
    ]);

    const result = await listClosuresByClub("club_1");

    expect(result).toEqual([
      {
        id: "closure_1",
        courtId: "court_1",
        startsAt,
        endsAt,
        reason: "Club rented for a tournament",
        createdAt,
        createdBy: "user_1",
        cancelledAt: undefined,
        cancelledBy: undefined,
        courtName: "Court 1",
      },
    ]);
  });
});

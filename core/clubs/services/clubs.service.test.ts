import { describe, it, expect, vi, beforeEach } from "vitest";

// clubs.service.ts eagerly imports the real Prisma client at module load —
// mock it so importing the module doesn't require a real DATABASE_URL (same
// pattern as core/courts/services/getClubsAvailability.test.ts).
const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: { club: { findMany: findManyMock } },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { listActiveClubs } from "./clubs.service";
import { CLUB_OPERATIONAL_WHERE } from "@/lib/mercadopago/operationalStatus";

function makeClubRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "club_1",
    name: "Operational Club",
    legalName: null,
    taxId: null,
    email: "club@example.com",
    phone: null,
    address: null,
    country: null,
    province: null,
    city: null,
    zipCode: null,
    logoUrl: null,
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    plan: "BASIC",
    status: "ACTIVE",
    requiresPrepayment: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "user_1",
    updatedBy: "user_1",
    ...overrides,
  };
}

describe("listActiveClubs", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("queries with CLUB_OPERATIONAL_WHERE (ACTIVE status merged with CONNECTED MP account), not a bare ACTIVE-only filter", async () => {
    findManyMock.mockResolvedValue([]);

    await listActiveClubs();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: CLUB_OPERATIONAL_WHERE }),
    );
  });

  it("does not duplicate the ACTIVE condition alongside CLUB_OPERATIONAL_WHERE", async () => {
    findManyMock.mockResolvedValue([]);

    await listActiveClubs();

    const callArgs = findManyMock.mock.calls[0][0];
    // Only one `status` key should exist in the composed where clause.
    expect(Object.keys(callArgs.where).filter((k) => k === "status")).toEqual([
      "status",
    ]);
    expect(callArgs.where.status).toBe("ACTIVE");
  });

  it("maps through whatever rows the query-level filter returns (a non-operational club is expected to never appear here)", async () => {
    findManyMock.mockResolvedValue([makeClubRow()]);

    const clubs = await listActiveClubs();

    expect(clubs).toHaveLength(1);
    expect(clubs[0].id).toBe("club_1");
  });
});

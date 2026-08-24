import { describe, it, expect, vi, beforeEach } from "vitest";

// courts.service.ts eagerly constructs a real Prisma/Neon client at import
// time — mock it so importing the module doesn't require a real
// DATABASE_URL (same pattern as getClubsAvailability.test.ts).
const { courtFindManyMock } = vi.hoisted(() => ({
  courtFindManyMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: { court: { findMany: courtFindManyMock } },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { listCourtsByClub } from "./courts.service";
import { CLUB_OPERATIONAL_WHERE } from "@/lib/mercadopago/operationalStatus";

describe("listCourtsByClub — operationalOnly flag", () => {
  beforeEach(() => {
    courtFindManyMock.mockReset();
    courtFindManyMock.mockResolvedValue([]);
  });

  it("does not add a club-operational filter by default (owner call sites unaffected)", async () => {
    await listCourtsByClub("club_1");

    const callArgs = courtFindManyMock.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      clubId: "club_1",
      deletedAt: null,
      active: true,
    });
  });

  it("does not add a club-operational filter when operationalOnly is explicitly false", async () => {
    await listCourtsByClub("club_1", { operationalOnly: false });

    const callArgs = courtFindManyMock.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty("club");
  });

  it("merges CLUB_OPERATIONAL_WHERE under `club` when operationalOnly is true", async () => {
    await listCourtsByClub("club_1", { operationalOnly: true });

    expect(courtFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clubId: "club_1",
          club: CLUB_OPERATIONAL_WHERE,
        }),
      }),
    );
  });

  it("combines operationalOnly with includeInactive without dropping either condition", async () => {
    await listCourtsByClub("club_1", {
      operationalOnly: true,
      includeInactive: true,
    });

    const callArgs = courtFindManyMock.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      clubId: "club_1",
      deletedAt: null,
      club: CLUB_OPERATIONAL_WHERE,
    });
  });

  it("returns [] when the query-level filter matches nothing (simulated non-operational club)", async () => {
    courtFindManyMock.mockResolvedValue([]);

    const courts = await listCourtsByClub("club_non_operational", {
      operationalOnly: true,
    });

    expect(courts).toEqual([]);
  });
});

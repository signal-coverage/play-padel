import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  disconnectMock,
  courtCountMock,
  listAllClubsMock,
  getOperationalStatusMock,
} = vi.hoisted(() => ({
  disconnectMock: vi.fn(),
  courtCountMock: vi.fn(),
  listAllClubsMock: vi.fn(),
  getOperationalStatusMock: vi.fn(),
}));

vi.mock("../../infrastructure/db/client", () => ({
  prisma: {
    court: { count: courtCountMock },
    $disconnect: disconnectMock,
  },
}));

vi.mock("../../core/clubs/services/clubs.service", () => ({
  listAllClubs: listAllClubsMock,
}));

vi.mock("../../lib/mercadopago/operationalStatus", () => ({
  getClubOperationalStatus: getOperationalStatusMock,
}));

import { describeClub } from "./describe-club";

function makeClubListItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "club_1",
    name: "Alpha Club",
    slug: "alpha-club",
    status: "ACTIVE",
    plan: "PRO",
    courtLimit: null,
    mpTokenIssue: false,
    membershipPastDue: false,
    noOperatingHours: false,
    isFreePlan: false,
    ...overrides,
  };
}

beforeEach(() => {
  disconnectMock.mockReset();
  courtCountMock.mockReset().mockResolvedValue(3);
  listAllClubsMock.mockReset().mockResolvedValue([makeClubListItem()]);
  getOperationalStatusMock.mockReset().mockResolvedValue({
    operational: true,
    cause: null,
    email: "club@mp.example.com",
    nickname: "alphaclub",
  });
});

describe("describeClub", () => {
  it("reports not-found without throwing when the club doesn't exist, and always disconnects", async () => {
    listAllClubsMock.mockResolvedValue([]);

    await expect(describeClub("club_missing")).resolves.not.toThrow();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("looks up the court count scoped to the club, excluding soft-deleted courts", async () => {
    await describeClub("club_1");

    expect(courtCountMock).toHaveBeenCalledWith({
      where: { clubId: "club_1", deletedAt: null },
    });
  });

  it("always disconnects, even when a lookup throws", async () => {
    courtCountMock.mockRejectedValue(new Error("DB unreachable"));

    await expect(describeClub("club_1")).rejects.toThrow("DB unreachable");
    expect(disconnectMock).toHaveBeenCalled();
  });
});

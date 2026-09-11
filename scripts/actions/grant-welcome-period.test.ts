import { describe, it, expect, vi, beforeEach } from "vitest";

const { clubFindUniqueMock, disconnectMock, grantWelcomePeriodMock } =
  vi.hoisted(() => ({
    clubFindUniqueMock: vi.fn(),
    disconnectMock: vi.fn(),
    grantWelcomePeriodMock: vi.fn(),
  }));

vi.mock("../../infrastructure/db/client", () => ({
  prisma: {
    club: { findUnique: clubFindUniqueMock },
    $disconnect: disconnectMock,
  },
}));

class ClubNotFoundError extends Error {}
class RealSubscriptionExistsError extends Error {}

vi.mock("../../core/billing/services/membership.service", () => ({
  grantWelcomePeriod: grantWelcomePeriodMock,
  ClubNotFoundError,
  RealSubscriptionExistsError,
}));

import { grantWelcomePeriodForClub } from "./grant-welcome-period";

beforeEach(() => {
  clubFindUniqueMock.mockReset();
  disconnectMock.mockReset();
  grantWelcomePeriodMock.mockReset();
});

describe("grantWelcomePeriodForClub", () => {
  it("grants the requested number of free months to the club", async () => {
    clubFindUniqueMock.mockResolvedValue({ name: "Riverside Padel Club" });
    grantWelcomePeriodMock.mockResolvedValue({ status: "TRIALING" });

    await grantWelcomePeriodForClub("club_1", 3, false);

    expect(grantWelcomePeriodMock).toHaveBeenCalledWith({
      clubId: "club_1",
      months: 3,
      force: false,
    });
  });

  it("does nothing when the club can't be found", async () => {
    clubFindUniqueMock.mockResolvedValue(null);

    await grantWelcomePeriodForClub("club_ghost", 3, false);

    expect(grantWelcomePeriodMock).not.toHaveBeenCalled();
  });

  it("surfaces a RealSubscriptionExistsError without throwing out of the action itself", async () => {
    clubFindUniqueMock.mockResolvedValue({ name: "Riverside Padel Club" });
    grantWelcomePeriodMock.mockRejectedValue(new RealSubscriptionExistsError());

    await expect(
      grantWelcomePeriodForClub("club_1", 3, false),
    ).resolves.not.toThrow();
  });
});

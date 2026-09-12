import { describe, it, expect, vi, beforeEach } from "vitest";

const { userProfileFindFirstMock, clubFindUniqueMock, disconnectMock } =
  vi.hoisted(() => ({
    userProfileFindFirstMock: vi.fn(),
    clubFindUniqueMock: vi.fn(),
    disconnectMock: vi.fn(),
  }));

vi.mock("../../infrastructure/db/client", () => ({
  prisma: {
    userProfile: { findFirst: userProfileFindFirstMock },
    club: { findUnique: clubFindUniqueMock },
    $disconnect: disconnectMock,
  },
}));

import { resolveClubIdByEmail } from "./resolve-club";

beforeEach(() => {
  userProfileFindFirstMock.mockReset();
  clubFindUniqueMock.mockReset();
  disconnectMock.mockReset();
});

describe("resolveClubIdByEmail", () => {
  it("resolves an ACTIVE club by its owner's email", async () => {
    userProfileFindFirstMock.mockResolvedValue({ clubId: "club_1" });
    clubFindUniqueMock.mockResolvedValue({
      name: "Riverside Padel Club",
      status: "ACTIVE",
    });

    const result = await resolveClubIdByEmail("owner@club.com");

    expect(userProfileFindFirstMock).toHaveBeenCalledWith({
      where: { email: "owner@club.com", role: "owner" },
      select: { clubId: true },
    });
    expect(result).toEqual({
      clubId: "club_1",
      clubName: "Riverside Padel Club",
    });
  });

  // The DB never actually deletes a Club row when its owner deletes their
  // account (see anonymizeUserProfile in core/users/services/users.service
  // .ts — only the UserProfile gets scrubbed) — so an email lookup alone
  // could resolve straight to a defunct club's stale row. Only an ACTIVE
  // club counts as a real match.
  it.each(["INACTIVE", "SUSPENDED", "DISABLED"] as const)(
    "returns null for a %s club, even though its owner's email still matches",
    async (status) => {
      userProfileFindFirstMock.mockResolvedValue({ clubId: "club_1" });
      clubFindUniqueMock.mockResolvedValue({
        name: "Riverside Padel Club",
        status,
      });

      const result = await resolveClubIdByEmail("owner@club.com");

      expect(result).toBeNull();
    },
  );

  it("returns null when no owner exists for that email", async () => {
    userProfileFindFirstMock.mockResolvedValue(null);

    const result = await resolveClubIdByEmail("nobody@example.com");

    expect(result).toBeNull();
    expect(clubFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns null when the matching profile is an owner row with no clubId yet", async () => {
    userProfileFindFirstMock.mockResolvedValue({ clubId: null });

    const result = await resolveClubIdByEmail("owner@club.com");

    expect(result).toBeNull();
    expect(clubFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns null when the owner's clubId points at a club that no longer exists", async () => {
    userProfileFindFirstMock.mockResolvedValue({ clubId: "club_ghost" });
    clubFindUniqueMock.mockResolvedValue(null);

    const result = await resolveClubIdByEmail("owner@club.com");

    expect(result).toBeNull();
  });
});

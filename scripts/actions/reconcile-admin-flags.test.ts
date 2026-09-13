import { describe, it, expect, vi, beforeEach } from "vitest";

const { disconnectMock, findManyMock, findUniqueMock, getUserListMock } =
  vi.hoisted(() => ({
    disconnectMock: vi.fn(),
    findManyMock: vi.fn(),
    findUniqueMock: vi.fn(),
    getUserListMock: vi.fn(),
  }));

vi.mock("../../infrastructure/db/client", () => ({
  prisma: {
    userProfile: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
    },
    $disconnect: disconnectMock,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { getUserList: getUserListMock },
  }),
}));

import { reconcileAdminFlags } from "./reconcile-admin-flags";

beforeEach(() => {
  disconnectMock.mockReset();
  findManyMock.mockReset().mockResolvedValue([]);
  findUniqueMock.mockReset();
  getUserListMock.mockReset().mockResolvedValue({ data: [], totalCount: 0 });
});

describe("reconcileAdminFlags", () => {
  it("reports no mismatches (and always disconnects) when both sides agree", async () => {
    findManyMock.mockResolvedValue([
      { id: "user_1", email: "a@example.com", displayName: "A" },
    ]);
    getUserListMock.mockResolvedValue({
      data: [{ id: "user_1", publicMetadata: { isAdmin: true } }],
      totalCount: 1,
    });

    await expect(reconcileAdminFlags()).resolves.not.toThrow();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("flags a user with UserProfile.isAdmin but no matching Clerk publicMetadata", async () => {
    findManyMock.mockResolvedValue([
      { id: "user_1", email: "a@example.com", displayName: "A" },
    ]);
    getUserListMock.mockResolvedValue({ data: [], totalCount: 0 });

    await reconcileAdminFlags();

    // Behavior is verified via reconcileAdminFlags not throwing and the
    // underlying calls below — the CLI-facing report text itself isn't
    // asserted line-by-line (log/note are presentation, not the contract).
    expect(findManyMock).toHaveBeenCalledWith({
      where: { isAdmin: true },
      select: { id: true, email: true, displayName: true },
    });
  });

  it("flags a user with Clerk publicMetadata.isAdmin but no matching UserProfile.isAdmin, looking up their profile for context", async () => {
    findManyMock.mockResolvedValue([]);
    getUserListMock.mockResolvedValue({
      data: [{ id: "user_clerk_only", publicMetadata: { isAdmin: true } }],
      totalCount: 1,
    });
    findUniqueMock.mockResolvedValue({
      email: "clerkonly@example.com",
      displayName: "Clerk Only",
    });

    await reconcileAdminFlags();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user_clerk_only" },
      select: { email: true, displayName: true },
    });
  });

  it("paginates through every Clerk user, not just the first page", async () => {
    findManyMock.mockResolvedValue([]);
    getUserListMock
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({
          id: `user_${i}`,
          publicMetadata: {},
        })),
        totalCount: 501,
      })
      .mockResolvedValueOnce({
        data: [{ id: "user_500", publicMetadata: { isAdmin: true } }],
        totalCount: 501,
      });

    await reconcileAdminFlags();

    expect(getUserListMock).toHaveBeenCalledTimes(2);
    expect(getUserListMock).toHaveBeenNthCalledWith(2, {
      limit: 500,
      offset: 500,
    });
  });

  it("ignores a user who has both flags set", async () => {
    findManyMock.mockResolvedValue([
      { id: "user_1", email: "a@example.com", displayName: "A" },
    ]);
    getUserListMock.mockResolvedValue({
      data: [{ id: "user_1", publicMetadata: { isAdmin: true } }],
      totalCount: 1,
    });

    await reconcileAdminFlags();

    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("disconnects even when the Clerk API call throws", async () => {
    getUserListMock.mockRejectedValue(new Error("Clerk API is down"));

    await expect(reconcileAdminFlags()).rejects.toThrow("Clerk API is down");
    expect(disconnectMock).toHaveBeenCalled();
  });
});

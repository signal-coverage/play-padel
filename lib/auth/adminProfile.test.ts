import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: { findUnique: vi.fn() },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { requireAdminProfile } from "./adminProfile";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  authMock.mockReset();
  findUniqueMock.mockReset();
});

describe("requireAdminProfile", () => {
  it("returns a 401 response when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const result = await requireAdminProfile();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns a 403 response when the caller has no UserProfile row", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    findUniqueMock.mockResolvedValue(null);

    const result = await requireAdminProfile();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns a 403 response when isAdmin is not exactly true", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    findUniqueMock.mockResolvedValue({ isAdmin: false, displayName: "Nico" });

    const result = await requireAdminProfile();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns the admin's userId and displayName when authorized", async () => {
    authMock.mockResolvedValue({ userId: "user_admin" });
    findUniqueMock.mockResolvedValue({
      isAdmin: true,
      displayName: "Admin Person",
    });

    const result = await requireAdminProfile();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user_admin" },
      select: { isAdmin: true, displayName: true },
    });
    expect(result).toEqual({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin Person" },
    });
  });
});

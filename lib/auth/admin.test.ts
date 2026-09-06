import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { isAdminUser, requireAdmin } from "./admin";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const clerkClientMock = clerkClient as unknown as ReturnType<typeof vi.fn>;
const getUserMock = vi.fn();

beforeEach(() => {
  authMock.mockReset();
  clerkClientMock.mockReset();
  getUserMock.mockReset();
  clerkClientMock.mockResolvedValue({
    users: { getUser: getUserMock },
  });
});

describe("isAdminUser", () => {
  it("returns true when the Clerk user's publicMetadata.isAdmin is exactly true", async () => {
    getUserMock.mockResolvedValue({ publicMetadata: { isAdmin: true } });

    const result = await isAdminUser("user_1");

    expect(getUserMock).toHaveBeenCalledWith("user_1");
    expect(result).toBe(true);
  });

  it("returns false when publicMetadata.isAdmin is missing", async () => {
    getUserMock.mockResolvedValue({ publicMetadata: {} });

    const result = await isAdminUser("user_1");

    expect(result).toBe(false);
  });

  it("returns false when publicMetadata.isAdmin is a truthy non-boolean value", async () => {
    getUserMock.mockResolvedValue({ publicMetadata: { isAdmin: "true" } });

    const result = await isAdminUser("user_1");

    expect(result).toBe(false);
  });

  it("returns false when publicMetadata is entirely absent", async () => {
    getUserMock.mockResolvedValue({ publicMetadata: undefined });

    const result = await isAdminUser("user_1");

    expect(result).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("returns a 401 response when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const result = await requireAdmin();

    expect(result?.status).toBe(401);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns a 403 response when signed in but not an admin", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    getUserMock.mockResolvedValue({ publicMetadata: { isAdmin: false } });

    const result = await requireAdmin();

    expect(result?.status).toBe(403);
  });

  it("returns null when signed in as an admin", async () => {
    authMock.mockResolvedValue({ userId: "user_admin" });
    getUserMock.mockResolvedValue({ publicMetadata: { isAdmin: true } });

    const result = await requireAdmin();

    expect(result).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  getClubById: vi.fn(),
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { getClubById } from "@/core/clubs/services/clubs.service";
import { requireAdminClub } from "./require-admin-club";

const requireAdminProfileMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const getClubByIdMock = getClubById as ReturnType<typeof vi.fn>;

beforeEach(() => {
  requireAdminProfileMock.mockReset();
  getClubByIdMock.mockReset();
});

describe("requireAdminClub", () => {
  it("returns the admin profile check's own response when the caller isn't an admin", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireAdminProfileMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const result = await requireAdminClub("club_1");

    expect(result).toEqual({ ok: false, response: forbidden });
    expect(getClubByIdMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the route's clubId doesn't match any club", async () => {
    requireAdminProfileMock.mockResolvedValue({
      ok: true,
      context: { userId: "admin_1", displayName: "Admin" },
    });
    getClubByIdMock.mockResolvedValue(null);

    const result = await requireAdminClub("club_missing");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
      const body = await result.response.json();
      expect(body.error).toBe("Club not found");
    }
  });

  it("returns the admin's userId and the route's clubId when the club exists", async () => {
    requireAdminProfileMock.mockResolvedValue({
      ok: true,
      context: { userId: "admin_1", displayName: "Admin" },
    });
    getClubByIdMock.mockResolvedValue({ id: "club_1", name: "Club 1" });

    const result = await requireAdminClub("club_1");

    expect(result).toEqual({
      ok: true,
      context: { userId: "admin_1", clubId: "club_1" },
    });
    expect(getClubByIdMock).toHaveBeenCalledWith("club_1");
  });
});

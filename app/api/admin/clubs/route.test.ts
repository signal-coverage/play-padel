import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  listAllClubs: vi.fn(),
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { listAllClubs } from "@/core/clubs/services/clubs.service";
import { GET } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const listAllClubsMock = listAllClubs as ReturnType<typeof vi.fn>;

describe("GET /api/admin/clubs", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listAllClubsMock.mockReset();
  });

  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET();

    expect(response).toBe(forbidden);
    expect(listAllClubsMock).not.toHaveBeenCalled();
  });

  it("returns the full club list when authorized", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin" },
    });
    const clubs = [
      {
        id: "club_1",
        name: "Club Padel Norte",
        status: "ACTIVE",
        plan: "PRO",
        mpTokenIssue: false,
        membershipPastDue: false,
        noOperatingHours: false,
      },
      {
        id: "club_2",
        name: "Club Sur",
        status: "SUSPENDED",
        plan: "BASIC",
        mpTokenIssue: true,
        membershipPastDue: true,
        noOperatingHours: true,
      },
    ];
    listAllClubsMock.mockResolvedValue(clubs);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ clubs });
  });
});

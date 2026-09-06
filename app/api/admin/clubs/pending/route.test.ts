import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  listPendingClubs: vi.fn(),
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { listPendingClubs } from "@/core/clubs/services/clubs.service";
import { GET } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const listPendingClubsMock = listPendingClubs as ReturnType<typeof vi.fn>;

describe("GET /api/admin/clubs/pending", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listPendingClubsMock.mockReset();
  });

  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET();

    expect(response).toBe(forbidden);
    expect(listPendingClubsMock).not.toHaveBeenCalled();
  });

  it("returns the pending club queue when authorized", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin Person" },
    });
    const clubs = [
      {
        id: "club_1",
        name: "New Club",
        email: "owner@newclub.com",
        createdAt: new Date("2026-09-01T00:00:00Z"),
      },
    ];
    listPendingClubsMock.mockResolvedValue(clubs);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      clubs: [{ ...clubs[0], createdAt: clubs[0].createdAt.toISOString() }],
    });
  });

  it("returns an empty queue when no clubs are pending", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin Person" },
    });
    listPendingClubsMock.mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ clubs: [] });
  });
});

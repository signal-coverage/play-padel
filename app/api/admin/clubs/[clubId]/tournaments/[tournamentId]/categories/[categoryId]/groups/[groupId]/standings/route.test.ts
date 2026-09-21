import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../../../../_lib/require-admin-club", () => ({
  requireAdminClub: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/standings.service", () => ({
  computeGroupStandings: vi.fn(),
}));

import { requireAdminClub } from "../../../../../../_lib/require-admin-club";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";
import { computeGroupStandings } from "@/core/tournaments/services/standings.service";
import { GET } from "./route";

const requireAdminClubMock = requireAdminClub as ReturnType<typeof vi.fn>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const computeGroupStandingsMock = computeGroupStandings as ReturnType<
  typeof vi.fn
>;

function makeParams() {
  return {
    params: Promise.resolve({
      clubId: "club_1",
      tournamentId: "tourney_1",
      categoryId: "cat_1",
      groupId: "group_1",
    }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1/categories/cat_1/groups/group_1/standings",
  ) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "admin_1", clubId: "club_1" },
  });
});

describe("GET /api/admin/clubs/[clubId]/tournaments/[tournamentId]/categories/[categoryId]/groups/[groupId]/standings", () => {
  it("returns the admin-club check's own response when it fails", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireAdminClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET(makeRequest(), makeParams());

    expect(response).toBe(forbidden);
  });

  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(computeGroupStandingsMock).not.toHaveBeenCalled();
  });

  it("returns the computed standings when owned", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    computeGroupStandingsMock.mockResolvedValue([{ teamId: "team_1" }]);

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(computeGroupStandingsMock).toHaveBeenCalledWith("group_1");
    expect(body.standings).toHaveLength(1);
  });

  it("returns 404 with the thrown error's message when standings computation fails", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    computeGroupStandingsMock.mockRejectedValue(new Error("Group not found"));

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Group not found");
  });
});

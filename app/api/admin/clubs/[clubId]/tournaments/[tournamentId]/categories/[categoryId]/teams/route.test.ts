import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../../_lib/require-admin-club", () => ({
  requireAdminClub: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournamentTeams.service", () => ({
  listTeamsForCategoryWithPlayers: vi.fn(),
}));

import { requireAdminClub } from "../../../../_lib/require-admin-club";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";
import { listTeamsForCategoryWithPlayers } from "@/core/tournaments/services/tournamentTeams.service";
import { GET } from "./route";

const requireAdminClubMock = requireAdminClub as ReturnType<typeof vi.fn>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const listTeamsForCategoryWithPlayersMock =
  listTeamsForCategoryWithPlayers as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({
      clubId: "club_1",
      tournamentId: "tourney_1",
      categoryId: "cat_1",
    }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1/categories/cat_1/teams",
  ) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "admin_1", clubId: "club_1" },
  });
});

describe("GET /api/admin/clubs/[clubId]/tournaments/[tournamentId]/categories/[categoryId]/teams", () => {
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
    expect(listTeamsForCategoryWithPlayersMock).not.toHaveBeenCalled();
  });

  it("returns the category's teams when owned", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    listTeamsForCategoryWithPlayersMock.mockResolvedValue([{ id: "team_1" }]);

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(listTeamsForCategoryWithPlayersMock).toHaveBeenCalledWith("cat_1");
    expect(body.teams).toHaveLength(1);
  });
});

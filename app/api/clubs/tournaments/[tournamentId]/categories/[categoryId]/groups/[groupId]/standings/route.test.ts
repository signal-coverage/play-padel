import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../../../../../_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/standings.service", () => ({
  computeGroupStandings: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../../../_lib/require-owner";
import { findOwnedCategory } from "../../../../../../../_lib/find-owned-category";
import { computeGroupStandings } from "@/core/tournaments/services/standings.service";
import { GET } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const computeGroupStandingsMock = computeGroupStandings as ReturnType<
  typeof vi.fn
>;

function makeParams() {
  return {
    params: Promise.resolve({
      tournamentId: "tourney_1",
      categoryId: "cat_1",
      groupId: "group_1",
    }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/groups/group_1/standings",
  ) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_1", clubId: "club_1" },
  });
});

describe("GET .../groups/[groupId]/standings", () => {
  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(computeGroupStandingsMock).not.toHaveBeenCalled();
  });

  it("returns the computed standings when owned", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    computeGroupStandingsMock.mockResolvedValue([
      {
        teamId: "t1",
        wins: 1,
        setsWon: 2,
        setsLost: 0,
        gamesWon: 12,
        gamesLost: 4,
      },
    ]);

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(computeGroupStandingsMock).toHaveBeenCalledWith("group_1");
    expect(response.status).toBe(200);
    expect(body.standings).toHaveLength(1);
  });

  it("returns 404 when the group doesn't exist", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    computeGroupStandingsMock.mockRejectedValue(new Error("Group not found"));

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
  });
});

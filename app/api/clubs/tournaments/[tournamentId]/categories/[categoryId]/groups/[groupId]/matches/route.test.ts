import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../../../../../_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/matches.service", () => ({
  listMatchesForGroup: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../../../_lib/require-owner";
import { findOwnedCategory } from "../../../../../../../_lib/find-owned-category";
import { listMatchesForGroup } from "@/core/tournaments/services/matches.service";
import { GET } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const listMatchesForGroupMock = listMatchesForGroup as ReturnType<typeof vi.fn>;

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
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/groups/group_1/matches",
  ) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_1", clubId: "club_1" },
  });
});

describe("GET .../groups/[groupId]/matches", () => {
  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(listMatchesForGroupMock).not.toHaveBeenCalled();
  });

  it("returns the group's matches when owned", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    listMatchesForGroupMock.mockResolvedValue([
      { id: "match_1", teamAId: "t1", teamBId: "t2", status: "SCHEDULED" },
    ]);

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(listMatchesForGroupMock).toHaveBeenCalledWith("group_1");
    expect(response.status).toBe(200);
    expect(body.matches).toHaveLength(1);
  });
});

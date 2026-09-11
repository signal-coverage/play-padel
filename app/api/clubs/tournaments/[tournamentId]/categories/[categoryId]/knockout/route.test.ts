import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../../../_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/matches.service", () => ({
  listKnockoutMatchesForCategory: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../_lib/require-owner";
import { findOwnedCategory } from "../../../../../_lib/find-owned-category";
import { listKnockoutMatchesForCategory } from "@/core/tournaments/services/matches.service";
import { GET } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const listKnockoutMatchesForCategoryMock =
  listKnockoutMatchesForCategory as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ tournamentId: "tourney_1", categoryId: "cat_1" }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/knockout",
  ) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_1", clubId: "club_1" },
  });
});

describe("GET /api/clubs/tournaments/[tournamentId]/categories/[categoryId]/knockout", () => {
  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(listKnockoutMatchesForCategoryMock).not.toHaveBeenCalled();
  });

  it("returns the category's knockout matches when owned", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    listKnockoutMatchesForCategoryMock.mockResolvedValue([
      { id: "ko_1", knockoutRound: "FINAL" },
    ]);

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(listKnockoutMatchesForCategoryMock).toHaveBeenCalledWith("cat_1");
    expect(response.status).toBe(200);
    expect(body.matches).toHaveLength(1);
  });
});

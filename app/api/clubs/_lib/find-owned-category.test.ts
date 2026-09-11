import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  getTournamentDetailForOwner: vi.fn(),
}));

import { getTournamentDetailForOwner } from "@/core/tournaments/services/tournaments.service";
import { findOwnedCategory } from "./find-owned-category";

const getTournamentDetailForOwnerMock =
  getTournamentDetailForOwner as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getTournamentDetailForOwnerMock.mockReset();
});

describe("findOwnedCategory", () => {
  it("returns null when the tournament isn't owned by this club", async () => {
    getTournamentDetailForOwnerMock.mockResolvedValue(null);

    const result = await findOwnedCategory("club_1", "tourney_1", "cat_1");

    expect(result).toBeNull();
  });

  it("returns null when the category doesn't belong to the tournament", async () => {
    getTournamentDetailForOwnerMock.mockResolvedValue({
      id: "tourney_1",
      categories: [{ id: "cat_other" }],
    });

    const result = await findOwnedCategory("club_1", "tourney_1", "cat_1");

    expect(result).toBeNull();
  });

  it("returns the category when it belongs to the owned tournament", async () => {
    getTournamentDetailForOwnerMock.mockResolvedValue({
      id: "tourney_1",
      categories: [{ id: "cat_1", name: "Category A" }],
    });

    const result = await findOwnedCategory("club_1", "tourney_1", "cat_1");

    expect(result).toEqual({ id: "cat_1", name: "Category A" });
  });
});

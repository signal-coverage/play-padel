import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  getTournamentDetailForOwner: vi.fn(),
}));

import { getTournamentDetailForOwner } from "@/core/tournaments/services/tournaments.service";
import { findOwnedTournament } from "./find-owned-tournament";

const getTournamentDetailForOwnerMock =
  getTournamentDetailForOwner as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getTournamentDetailForOwnerMock.mockReset();
});

describe("findOwnedTournament", () => {
  it("returns null when the tournament isn't owned by this club", async () => {
    getTournamentDetailForOwnerMock.mockResolvedValue(null);

    const result = await findOwnedTournament("club_1", "tourney_1");

    expect(result).toBeNull();
    expect(getTournamentDetailForOwnerMock).toHaveBeenCalledWith(
      "club_1",
      "tourney_1",
    );
  });

  it("returns the tournament when owned by this club", async () => {
    getTournamentDetailForOwnerMock.mockResolvedValue({ id: "tourney_1" });

    const result = await findOwnedTournament("club_1", "tourney_1");

    expect(result).toEqual({ id: "tourney_1" });
  });
});

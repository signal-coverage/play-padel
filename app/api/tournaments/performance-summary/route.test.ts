import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/requireAuthUser", () => ({
  requireAuthUser: vi.fn(),
}));

vi.mock("@/core/tournaments/services/standings.service", () => ({
  computePerformanceSummaryForPlayer: vi.fn(),
}));

import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { computePerformanceSummaryForPlayer } from "@/core/tournaments/services/standings.service";
import { GET } from "./route";

const requireAuthUserMock = requireAuthUser as ReturnType<typeof vi.fn>;
const computePerformanceSummaryForPlayerMock =
  computePerformanceSummaryForPlayer as ReturnType<typeof vi.fn>;

beforeEach(() => {
  requireAuthUserMock.mockReset();
  computePerformanceSummaryForPlayerMock.mockReset();
});

describe("GET /api/tournaments/performance-summary", () => {
  it("returns 401 when not signed in", async () => {
    const unauthorized = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
    requireAuthUserMock.mockResolvedValue({
      ok: false,
      response: unauthorized,
    });

    const response = await GET();

    expect(response).toBe(unauthorized);
    expect(computePerformanceSummaryForPlayerMock).not.toHaveBeenCalled();
  });

  it("returns the signed-in player's own performance summary", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    computePerformanceSummaryForPlayerMock.mockResolvedValue({
      tournamentsWon: 1,
      tournamentsPlayed: 3,
      latestTournamentName: "Summer Open",
      latestResults: ["W", "L"],
    });

    const response = await GET();
    const body = await response.json();

    expect(computePerformanceSummaryForPlayerMock).toHaveBeenCalledWith(
      "player_1",
    );
    expect(body.performance).toEqual({
      tournamentsWon: 1,
      tournamentsPlayed: 3,
      latestTournamentName: "Summer Open",
      latestResults: ["W", "L"],
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/requireAuthUser", () => ({
  requireAuthUser: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  getTournamentDetailForPlayer: vi.fn(),
}));

import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { getTournamentDetailForPlayer } from "@/core/tournaments/services/tournaments.service";
import { GET } from "./route";

const requireAuthUserMock = requireAuthUser as ReturnType<typeof vi.fn>;
const getTournamentDetailForPlayerMock =
  getTournamentDetailForPlayer as ReturnType<typeof vi.fn>;

function makeParams() {
  return { params: Promise.resolve({ tournamentId: "tourney_1" }) };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/tournaments/tourney_1",
  ) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  requireAuthUserMock.mockReset();
  getTournamentDetailForPlayerMock.mockReset();
});

describe("GET /api/tournaments/[tournamentId]", () => {
  it("returns 401 when not signed in", async () => {
    const unauthorized = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
    requireAuthUserMock.mockResolvedValue({
      ok: false,
      response: unauthorized,
    });

    const response = await GET(makeRequest(), makeParams());

    expect(response).toBe(unauthorized);
    expect(getTournamentDetailForPlayerMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the tournament doesn't exist", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    getTournamentDetailForPlayerMock.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
  });

  it("returns the tournament detail when found", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    getTournamentDetailForPlayerMock.mockResolvedValue({ id: "tourney_1" });

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(getTournamentDetailForPlayerMock).toHaveBeenCalledWith(
      "tourney_1",
      "player_1",
    );
    expect(body.tournament).toEqual({ id: "tourney_1" });
  });
});

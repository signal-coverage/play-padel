import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/requireAuthUser", () => ({
  requireAuthUser: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournamentTeams.service", () => ({
  listTeamsForCategoryWithPlayers: vi.fn(),
}));

import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { listTeamsForCategoryWithPlayers } from "@/core/tournaments/services/tournamentTeams.service";
import { GET } from "./route";

const requireAuthUserMock = requireAuthUser as ReturnType<typeof vi.fn>;
const listTeamsForCategoryWithPlayersMock =
  listTeamsForCategoryWithPlayers as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ tournamentId: "tourney_1", categoryId: "cat_1" }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/tournaments/tourney_1/categories/cat_1/teams",
  ) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  requireAuthUserMock.mockReset();
  listTeamsForCategoryWithPlayersMock.mockReset();
});

describe("GET /api/tournaments/[tournamentId]/categories/[categoryId]/teams", () => {
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
    expect(listTeamsForCategoryWithPlayersMock).not.toHaveBeenCalled();
  });

  it("lists teams for the category, with each player's display name", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    listTeamsForCategoryWithPlayersMock.mockResolvedValue([
      {
        id: "team_1",
        player1DisplayName: "Ana Gómez",
        player2DisplayName: "Bruno Díaz",
      },
    ]);

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(listTeamsForCategoryWithPlayersMock).toHaveBeenCalledWith("cat_1");
    expect(body.teams).toHaveLength(1);
    expect(body.teams[0].player1DisplayName).toBe("Ana Gómez");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/requireAuthUser", () => ({
  requireAuthUser: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  listOpenTournamentsForPlayer: vi.fn(),
}));

import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { listOpenTournamentsForPlayer } from "@/core/tournaments/services/tournaments.service";
import { GET } from "./route";

const requireAuthUserMock = requireAuthUser as ReturnType<typeof vi.fn>;
const listOpenTournamentsForPlayerMock =
  listOpenTournamentsForPlayer as ReturnType<typeof vi.fn>;

beforeEach(() => {
  requireAuthUserMock.mockReset();
  listOpenTournamentsForPlayerMock.mockReset();
});

describe("GET /api/tournaments/open", () => {
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
    expect(listOpenTournamentsForPlayerMock).not.toHaveBeenCalled();
  });

  it("lists open tournaments for the signed-in player", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    listOpenTournamentsForPlayerMock.mockResolvedValue([{ id: "tourney_1" }]);

    const response = await GET();
    const body = await response.json();

    expect(listOpenTournamentsForPlayerMock).toHaveBeenCalledWith("player_1");
    expect(body.tournaments).toHaveLength(1);
  });
});

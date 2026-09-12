import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/requireAuthUser", () => ({
  requireAuthUser: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournamentTeams.service", () => ({
  withdrawTeam: vi.fn(),
}));

import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { withdrawTeam } from "@/core/tournaments/services/tournamentTeams.service";
import { POST } from "./route";

const requireAuthUserMock = requireAuthUser as ReturnType<typeof vi.fn>;
const withdrawTeamMock = withdrawTeam as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ tournamentId: "tourney_1", teamId: "team_1" }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/tournaments/tourney_1/teams/team_1/withdraw",
    { method: "POST" },
  ) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  requireAuthUserMock.mockReset();
  withdrawTeamMock.mockReset();
});

describe("POST /api/tournaments/[tournamentId]/teams/[teamId]/withdraw", () => {
  it("returns 401 when not signed in", async () => {
    const unauthorized = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
    requireAuthUserMock.mockResolvedValue({
      ok: false,
      response: unauthorized,
    });

    const response = await POST(makeRequest(), makeParams());

    expect(response).toBe(unauthorized);
    expect(withdrawTeamMock).not.toHaveBeenCalled();
  });

  it("withdraws the team when allowed", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    withdrawTeamMock.mockResolvedValue({ id: "team_1", status: "WITHDRAWN" });

    const response = await POST(makeRequest(), makeParams());

    expect(withdrawTeamMock).toHaveBeenCalledWith("team_1", "player_1");
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    withdrawTeamMock.mockRejectedValue(new Error("not allowed"));

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("not allowed");
  });
});

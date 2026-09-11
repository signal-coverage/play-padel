import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/requireAuthUser", () => ({
  requireAuthUser: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournamentTeams.service", () => ({
  registerTeam: vi.fn(),
}));

import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { registerTeam } from "@/core/tournaments/services/tournamentTeams.service";
import { POST } from "./route";

const requireAuthUserMock = requireAuthUser as ReturnType<typeof vi.fn>;
const registerTeamMock = registerTeam as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ tournamentId: "tourney_1", categoryId: "cat_1" }),
  };
}

function makeRequest(body: unknown) {
  return new Request(
    "http://localhost/api/tournaments/tourney_1/categories/cat_1/register",
    { method: "POST", body: JSON.stringify(body) },
  ) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  requireAuthUserMock.mockReset();
  registerTeamMock.mockReset();
});

describe("POST /api/tournaments/[tournamentId]/categories/[categoryId]/register", () => {
  it("returns 401 when not signed in", async () => {
    const unauthorized = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
    requireAuthUserMock.mockResolvedValue({
      ok: false,
      response: unauthorized,
    });

    const response = await POST(makeRequest({ partnerId: "p1" }), makeParams());

    expect(response).toBe(unauthorized);
    expect(registerTeamMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });

    const response = await POST(makeRequest({}), makeParams());

    expect(response.status).toBe(400);
    expect(registerTeamMock).not.toHaveBeenCalled();
  });

  it("registers the team when valid", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    registerTeamMock.mockResolvedValue({ id: "team_1" });

    const response = await POST(makeRequest({ partnerId: "p1" }), makeParams());

    expect(registerTeamMock).toHaveBeenCalledWith("cat_1", "player_1", "p1");
    expect(response.status).toBe(201);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    requireAuthUserMock.mockResolvedValue({ ok: true, userId: "player_1" });
    registerTeamMock.mockRejectedValue(new Error("Registration is not open"));

    const response = await POST(makeRequest({ partnerId: "p1" }), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Registration is not open");
  });
});

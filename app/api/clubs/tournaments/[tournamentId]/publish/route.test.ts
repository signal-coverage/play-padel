import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("../../../_lib/find-owned-tournament", () => ({
  findOwnedTournament: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  publishTournament: vi.fn(),
}));

import { requireOwnerClub } from "../../../_lib/require-owner";
import { requireClubOperational } from "../../../_lib/require-club-operational";
import { findOwnedTournament } from "../../../_lib/find-owned-tournament";
import { publishTournament } from "@/core/tournaments/services/tournaments.service";
import { POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedTournamentMock = findOwnedTournament as ReturnType<typeof vi.fn>;
const publishTournamentMock = publishTournament as ReturnType<typeof vi.fn>;

function makeParams() {
  return { params: Promise.resolve({ tournamentId: "tourney_1" }) };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1/publish",
    { method: "POST" },
  ) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  requireOwnerClubMock.mockReset();
  requireClubOperationalMock.mockReset();
  findOwnedTournamentMock.mockReset();
  publishTournamentMock.mockReset();
  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_1", clubId: "club_1" },
  });
});

describe("POST /api/clubs/tournaments/[tournamentId]/publish", () => {
  it("returns 403 when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_mp_not_connected" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await POST(makeRequest(), makeParams());

    expect(response).toBe(forbidden);
    expect(findOwnedTournamentMock).not.toHaveBeenCalled();
  });

  it("returns 404 when not owned by this club", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedTournamentMock.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(publishTournamentMock).not.toHaveBeenCalled();
  });

  it("publishes the tournament when owned", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });
    publishTournamentMock.mockResolvedValue({
      id: "tourney_1",
      status: "REGISTRATION_OPEN",
    });

    const response = await POST(makeRequest(), makeParams());

    expect(publishTournamentMock).toHaveBeenCalledWith(
      "club_1",
      "tourney_1",
      "user_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });
    publishTournamentMock.mockRejectedValue(new Error("Only a draft"));

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Only a draft");
  });
});

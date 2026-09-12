import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("../../_lib/find-owned-tournament", () => ({
  findOwnedTournament: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  updateTournament: vi.fn(),
}));

import { requireOwnerClub } from "../../_lib/require-owner";
import { requireClubOperational } from "../../_lib/require-club-operational";
import { findOwnedTournament } from "../../_lib/find-owned-tournament";
import { updateTournament } from "@/core/tournaments/services/tournaments.service";
import { GET, PATCH } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedTournamentMock = findOwnedTournament as ReturnType<typeof vi.fn>;
const updateTournamentMock = updateTournament as ReturnType<typeof vi.fn>;

function makeParams() {
  return { params: Promise.resolve({ tournamentId: "tourney_1" }) };
}

function makeGetRequest() {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1",
  ) as unknown as Parameters<typeof GET>[0];
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/clubs/tournaments/tourney_1", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

beforeEach(() => {
  requireOwnerClubMock.mockReset();
  requireClubOperationalMock.mockReset();
  findOwnedTournamentMock.mockReset();
  updateTournamentMock.mockReset();
  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_1", clubId: "club_1" },
  });
});

describe("GET /api/clubs/tournaments/[tournamentId]", () => {
  it("returns 404 when not owned by this club", async () => {
    findOwnedTournamentMock.mockResolvedValue(null);

    const response = await GET(makeGetRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(requireClubOperationalMock).not.toHaveBeenCalled();
  });

  it("returns the tournament detail when owned", async () => {
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });

    const response = await GET(makeGetRequest(), makeParams());
    const body = await response.json();

    expect(body.tournament).toEqual({ id: "tourney_1" });
  });
});

describe("PATCH /api/clubs/tournaments/[tournamentId]", () => {
  it("returns 403 when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_mp_not_connected" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams(),
    );

    expect(response).toBe(forbidden);
    expect(findOwnedTournamentMock).not.toHaveBeenCalled();
  });

  it("returns 404 when not owned by this club", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedTournamentMock.mockResolvedValue(null);

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams(),
    );

    expect(response.status).toBe(404);
    expect(updateTournamentMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });

    const response = await PATCH(makePatchRequest({ name: "" }), makeParams());

    expect(response.status).toBe(400);
    expect(updateTournamentMock).not.toHaveBeenCalled();
  });

  it("updates the tournament when valid", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });
    updateTournamentMock.mockResolvedValue({ id: "tourney_1", name: "New" });

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams(),
    );

    expect(updateTournamentMock).toHaveBeenCalledWith(
      "club_1",
      "tourney_1",
      { name: "New" },
      "user_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });
    updateTournamentMock.mockRejectedValue(new Error("Cannot update"));

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams(),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Cannot update");
  });
});

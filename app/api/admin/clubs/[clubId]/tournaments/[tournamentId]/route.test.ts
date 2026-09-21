import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../_lib/require-admin-club", () => ({
  requireAdminClub: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/find-owned-tournament", () => ({
  findOwnedTournament: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  updateTournament: vi.fn(),
}));

import { requireAdminClub } from "../_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import { findOwnedTournament } from "@/app/api/clubs/_lib/find-owned-tournament";
import { updateTournament } from "@/core/tournaments/services/tournaments.service";
import { GET, PATCH } from "./route";

const requireAdminClubMock = requireAdminClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedTournamentMock = findOwnedTournament as ReturnType<typeof vi.fn>;
const updateTournamentMock = updateTournament as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ clubId: "club_1", tournamentId: "tourney_1" }),
  };
}

function makeRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1",
    { method: "PATCH", body: JSON.stringify(body) },
  ) as unknown as Parameters<typeof PATCH>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "admin_1", clubId: "club_1" },
  });
  requireClubOperationalMock.mockResolvedValue({ ok: true });
});

describe("GET /api/admin/clubs/[clubId]/tournaments/[tournamentId]", () => {
  it("returns the admin-club check's own response when it fails", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireAdminClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams(),
    );

    expect(response).toBe(forbidden);
  });

  it("returns 404 when the tournament isn't found for the club", async () => {
    findOwnedTournamentMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams(),
    );

    expect(response.status).toBe(404);
  });

  it("returns the tournament when found", async () => {
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams(),
    );
    const body = await response.json();

    expect(findOwnedTournamentMock).toHaveBeenCalledWith("club_1", "tourney_1");
    expect(body.tournament).toEqual({ id: "tourney_1" });
  });
});

describe("PATCH /api/admin/clubs/[clubId]/tournaments/[tournamentId]", () => {
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
      makeRequest({ name: "New name" }),
      makeParams(),
    );

    expect(response).toBe(forbidden);
    expect(updateTournamentMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the tournament isn't found for the club", async () => {
    findOwnedTournamentMock.mockResolvedValue(null);

    const response = await PATCH(
      makeRequest({ name: "New name" }),
      makeParams(),
    );

    expect(response.status).toBe(404);
    expect(updateTournamentMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });

    const response = await PATCH(makeRequest({ name: "" }), makeParams());

    expect(response.status).toBe(400);
    expect(updateTournamentMock).not.toHaveBeenCalled();
  });

  it("updates the tournament for the route's clubId when valid", async () => {
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });
    updateTournamentMock.mockResolvedValue({
      id: "tourney_1",
      name: "New name",
    });

    const response = await PATCH(
      makeRequest({ name: "New name" }),
      makeParams(),
    );

    expect(updateTournamentMock).toHaveBeenCalledWith(
      "club_1",
      "tourney_1",
      expect.objectContaining({ name: "New name" }),
      "admin_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });
    updateTournamentMock.mockRejectedValue(new Error("Something went wrong"));

    const response = await PATCH(
      makeRequest({ name: "New name" }),
      makeParams(),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Something went wrong");
  });
});

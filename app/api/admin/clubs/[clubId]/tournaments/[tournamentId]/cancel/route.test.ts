import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../_lib/require-admin-club", () => ({
  requireAdminClub: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/find-owned-tournament", () => ({
  findOwnedTournament: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  cancelTournament: vi.fn(),
}));

import { requireAdminClub } from "../../_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import { findOwnedTournament } from "@/app/api/clubs/_lib/find-owned-tournament";
import { cancelTournament } from "@/core/tournaments/services/tournaments.service";
import { POST } from "./route";

const requireAdminClubMock = requireAdminClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedTournamentMock = findOwnedTournament as ReturnType<typeof vi.fn>;
const cancelTournamentMock = cancelTournament as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ clubId: "club_1", tournamentId: "tourney_1" }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1/cancel",
    { method: "POST" },
  ) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "admin_1", clubId: "club_1" },
  });
  requireClubOperationalMock.mockResolvedValue({ ok: true });
});

describe("POST /api/admin/clubs/[clubId]/tournaments/[tournamentId]/cancel", () => {
  it("returns the admin-club check's own response when it fails", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireAdminClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await POST(makeRequest(), makeParams());

    expect(response).toBe(forbidden);
    expect(cancelTournamentMock).not.toHaveBeenCalled();
  });

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
    expect(cancelTournamentMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the tournament isn't found for the club", async () => {
    findOwnedTournamentMock.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(cancelTournamentMock).not.toHaveBeenCalled();
  });

  it("cancels the tournament for the route's clubId", async () => {
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });
    cancelTournamentMock.mockResolvedValue({
      id: "tourney_1",
      status: "CANCELLED",
    });

    const response = await POST(makeRequest(), makeParams());

    expect(cancelTournamentMock).toHaveBeenCalledWith(
      "club_1",
      "tourney_1",
      "admin_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedTournamentMock.mockResolvedValue({ id: "tourney_1" });
    cancelTournamentMock.mockRejectedValue(new Error("Something went wrong"));

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Something went wrong");
  });
});

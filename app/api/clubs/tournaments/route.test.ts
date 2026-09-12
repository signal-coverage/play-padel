import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  createTournament: vi.fn(),
  listTournamentsForOwner: vi.fn(),
}));

import { requireOwnerClub } from "../_lib/require-owner";
import { requireClubOperational } from "../_lib/require-club-operational";
import {
  createTournament,
  listTournamentsForOwner,
} from "@/core/tournaments/services/tournaments.service";
import { GET, POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const createTournamentMock = createTournament as ReturnType<typeof vi.fn>;
const listTournamentsForOwnerMock = listTournamentsForOwner as ReturnType<
  typeof vi.fn
>;

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/clubs/tournaments", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

const validBody = {
  name: "Summer Open",
  registrationOpensAt: new Date(Date.now() + 60_000).toISOString(),
  registrationClosesAt: new Date(Date.now() + 120_000).toISOString(),
  categories: [{ name: "Category A", groupCount: 2, advancesPerGroup: 2 }],
};

beforeEach(() => {
  requireOwnerClubMock.mockReset();
  requireClubOperationalMock.mockReset();
  createTournamentMock.mockReset();
  listTournamentsForOwnerMock.mockReset();
  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_1", clubId: "club_1" },
  });
});

describe("POST /api/clubs/tournaments", () => {
  it("returns 403 when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_mp_not_connected" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await POST(makeRequest(validBody));

    expect(response).toBe(forbidden);
    expect(createTournamentMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });

    const response = await POST(makeRequest({ name: "" }));

    expect(response.status).toBe(400);
    expect(createTournamentMock).not.toHaveBeenCalled();
  });

  it("creates the tournament when valid", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    createTournamentMock.mockResolvedValue({ id: "tourney_1" });

    const response = await POST(makeRequest(validBody));

    expect(createTournamentMock).toHaveBeenCalledWith(
      "club_1",
      expect.objectContaining({ name: "Summer Open" }),
      "user_1",
    );
    expect(response.status).toBe(201);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    createTournamentMock.mockRejectedValue(new Error("Something went wrong"));

    const response = await POST(makeRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Something went wrong");
  });
});

describe("GET /api/clubs/tournaments", () => {
  it("lists tournaments for the owner's club", async () => {
    listTournamentsForOwnerMock.mockResolvedValue([{ id: "tourney_1" }]);

    const response = await GET();
    const body = await response.json();

    expect(listTournamentsForOwnerMock).toHaveBeenCalledWith("club_1");
    expect(body.tournaments).toHaveLength(1);
  });
});

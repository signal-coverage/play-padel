import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("./_lib/require-admin-club", () => ({
  requireAdminClub: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("@/core/tournaments/services/tournaments.service", () => ({
  createTournament: vi.fn(),
  listTournamentsForOwner: vi.fn(),
}));

import { requireAdminClub } from "./_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import {
  createTournament,
  listTournamentsForOwner,
} from "@/core/tournaments/services/tournaments.service";
import { GET, POST } from "./route";

const requireAdminClubMock = requireAdminClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const createTournamentMock = createTournament as ReturnType<typeof vi.fn>;
const listTournamentsForOwnerMock = listTournamentsForOwner as ReturnType<
  typeof vi.fn
>;

function makeParams() {
  return { params: Promise.resolve({ clubId: "club_1" }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/clubs/club_1/tournaments", {
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
  vi.clearAllMocks();
  requireAdminClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "admin_1", clubId: "club_1" },
  });
});

describe("POST /api/admin/clubs/[clubId]/tournaments", () => {
  it("returns the admin-club check's own response when it fails", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireAdminClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await POST(makeRequest(validBody), makeParams());

    expect(response).toBe(forbidden);
    expect(createTournamentMock).not.toHaveBeenCalled();
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

    const response = await POST(makeRequest(validBody), makeParams());

    expect(response).toBe(forbidden);
    expect(createTournamentMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });

    const response = await POST(makeRequest({ name: "" }), makeParams());

    expect(response.status).toBe(400);
    expect(createTournamentMock).not.toHaveBeenCalled();
  });

  it("creates the tournament for the route's clubId when valid", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    createTournamentMock.mockResolvedValue({ id: "tourney_1" });

    const response = await POST(makeRequest(validBody), makeParams());

    expect(createTournamentMock).toHaveBeenCalledWith(
      "club_1",
      expect.objectContaining({ name: "Summer Open" }),
      "admin_1",
    );
    expect(response.status).toBe(201);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    createTournamentMock.mockRejectedValue(new Error("Something went wrong"));

    const response = await POST(makeRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Something went wrong");
  });
});

describe("GET /api/admin/clubs/[clubId]/tournaments", () => {
  it("returns the admin-club check's own response when it fails", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireAdminClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_1/tournaments",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams(),
    );

    expect(response).toBe(forbidden);
  });

  it("lists tournaments for the route's clubId", async () => {
    listTournamentsForOwnerMock.mockResolvedValue([{ id: "tourney_1" }]);

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_1/tournaments",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams(),
    );
    const body = await response.json();

    expect(listTournamentsForOwnerMock).toHaveBeenCalledWith("club_1");
    expect(body.tournaments).toHaveLength(1);
  });
});

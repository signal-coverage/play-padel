import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../../../../_lib/require-admin-club", () => ({
  requireAdminClub: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/matches.service", () => ({
  enterMatchScore: vi.fn(),
}));

import { requireAdminClub } from "../../../../../../_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";
import { enterMatchScore } from "@/core/tournaments/services/matches.service";
import { POST } from "./route";

const requireAdminClubMock = requireAdminClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const enterMatchScoreMock = enterMatchScore as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({
      clubId: "club_1",
      tournamentId: "tourney_1",
      categoryId: "cat_1",
      matchId: "match_1",
    }),
  };
}

function makeRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1/categories/cat_1/matches/match_1/score",
    { method: "POST", body: JSON.stringify(body) },
  ) as unknown as Parameters<typeof POST>[0];
}

const validBody = {
  sets: [{ setNumber: 1, teamAGames: 6, teamBGames: 4 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "admin_1", clubId: "club_1" },
  });
  requireClubOperationalMock.mockResolvedValue({ ok: true });
});

describe("POST /api/admin/clubs/[clubId]/tournaments/[tournamentId]/categories/[categoryId]/matches/[matchId]/score", () => {
  it("returns the admin-club check's own response when it fails", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireAdminClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await POST(makeRequest(validBody), makeParams());

    expect(response).toBe(forbidden);
    expect(enterMatchScoreMock).not.toHaveBeenCalled();
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
    expect(enterMatchScoreMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody), makeParams());

    expect(response.status).toBe(404);
    expect(enterMatchScoreMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });

    const response = await POST(makeRequest({ sets: [] }), makeParams());

    expect(response.status).toBe(400);
    expect(enterMatchScoreMock).not.toHaveBeenCalled();
  });

  it("enters the score for the route's clubId and the admin's userId", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    enterMatchScoreMock.mockResolvedValue(undefined);

    const response = await POST(makeRequest(validBody), makeParams());

    expect(enterMatchScoreMock).toHaveBeenCalledWith(
      "match_1",
      validBody.sets,
      "club_1",
      "admin_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    enterMatchScoreMock.mockRejectedValue(new Error("Something went wrong"));

    const response = await POST(makeRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Something went wrong");
  });
});

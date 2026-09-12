import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../../../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../../../../../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("../../../../../../../_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/matches.service", () => ({
  enterMatchScore: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../../../_lib/require-owner";
import { requireClubOperational } from "../../../../../../../_lib/require-club-operational";
import { findOwnedCategory } from "../../../../../../../_lib/find-owned-category";
import { enterMatchScore } from "@/core/tournaments/services/matches.service";
import { POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const enterMatchScoreMock = enterMatchScore as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({
      tournamentId: "tourney_1",
      categoryId: "cat_1",
      matchId: "match_1",
    }),
  };
}

function makeRequest(body: unknown) {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/matches/match_1/score",
    { method: "POST", body: JSON.stringify(body) },
  ) as unknown as Parameters<typeof POST>[0];
}

const VALID_SETS = [
  { setNumber: 1, teamAGames: 6, teamBGames: 4 },
  { setNumber: 2, teamAGames: 6, teamBGames: 2 },
];

beforeEach(() => {
  vi.clearAllMocks();
  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_1", clubId: "club_1" },
  });
  requireClubOperationalMock.mockResolvedValue({ ok: true });
});

describe("POST .../matches/[matchId]/score", () => {
  it("returns 403 when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_mp_not_connected" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await POST(
      makeRequest({ sets: VALID_SETS }),
      makeParams(),
    );

    expect(response).toBe(forbidden);
    expect(findOwnedCategoryMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ sets: VALID_SETS }),
      makeParams(),
    );

    expect(response.status).toBe(404);
    expect(enterMatchScoreMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });

    const response = await POST(makeRequest({ sets: [] }), makeParams());

    expect(response.status).toBe(400);
  });

  it("enters the score when valid", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    enterMatchScoreMock.mockResolvedValue(undefined);

    const response = await POST(
      makeRequest({ sets: VALID_SETS }),
      makeParams(),
    );

    expect(enterMatchScoreMock).toHaveBeenCalledWith(
      "match_1",
      VALID_SETS,
      "club_1",
      "user_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    enterMatchScoreMock.mockRejectedValue(
      new Error("This score is not complete yet (best-of-3)."),
    );

    const response = await POST(
      makeRequest({ sets: VALID_SETS }),
      makeParams(),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("This score is not complete yet (best-of-3).");
  });
});

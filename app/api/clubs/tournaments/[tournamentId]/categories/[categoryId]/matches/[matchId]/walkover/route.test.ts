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
  recordWalkover: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../../../_lib/require-owner";
import { requireClubOperational } from "../../../../../../../_lib/require-club-operational";
import { findOwnedCategory } from "../../../../../../../_lib/find-owned-category";
import { recordWalkover } from "@/core/tournaments/services/matches.service";
import { POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const recordWalkoverMock = recordWalkover as ReturnType<typeof vi.fn>;

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
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/matches/match_1/walkover",
    { method: "POST", body: JSON.stringify(body) },
  ) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_1", clubId: "club_1" },
  });
  requireClubOperationalMock.mockResolvedValue({ ok: true });
});

describe("POST .../matches/[matchId]/walkover", () => {
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
      makeRequest({ winningTeamId: "team_a" }),
      makeParams(),
    );

    expect(response).toBe(forbidden);
    expect(findOwnedCategoryMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ winningTeamId: "team_a" }),
      makeParams(),
    );

    expect(response.status).toBe(404);
    expect(recordWalkoverMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });

    const response = await POST(makeRequest({}), makeParams());

    expect(response.status).toBe(400);
  });

  it("records the walkover when valid", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    recordWalkoverMock.mockResolvedValue(undefined);

    const response = await POST(
      makeRequest({ winningTeamId: "team_a" }),
      makeParams(),
    );

    expect(recordWalkoverMock).toHaveBeenCalledWith(
      "match_1",
      "team_a",
      "club_1",
      "user_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    recordWalkoverMock.mockRejectedValue(
      new Error("This match has already been decided."),
    );

    const response = await POST(
      makeRequest({ winningTeamId: "team_a" }),
      makeParams(),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("This match has already been decided.");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../../../../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("../../../../../../_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/matches.service", () => ({
  generateKnockoutBracket: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../../_lib/require-owner";
import { requireClubOperational } from "../../../../../../_lib/require-club-operational";
import { findOwnedCategory } from "../../../../../../_lib/find-owned-category";
import { generateKnockoutBracket } from "@/core/tournaments/services/matches.service";
import { POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const generateKnockoutBracketMock = generateKnockoutBracket as ReturnType<
  typeof vi.fn
>;

function makeParams() {
  return {
    params: Promise.resolve({ tournamentId: "tourney_1", categoryId: "cat_1" }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/knockout/generate",
    { method: "POST" },
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

describe("POST .../categories/[categoryId]/knockout/generate", () => {
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
    expect(findOwnedCategoryMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(generateKnockoutBracketMock).not.toHaveBeenCalled();
  });

  it("generates the bracket when valid", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    generateKnockoutBracketMock.mockResolvedValue(undefined);

    const response = await POST(makeRequest(), makeParams());

    expect(generateKnockoutBracketMock).toHaveBeenCalledWith(
      "cat_1",
      "club_1",
      "user_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    generateKnockoutBracketMock.mockRejectedValue(
      new Error(
        "Groups must be locked before the knockout bracket can be generated.",
      ),
    );

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe(
      "Groups must be locked before the knockout bracket can be generated.",
    );
  });
});

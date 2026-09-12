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

vi.mock("@/core/tournaments/services/groups.service", () => ({
  lockGroups: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../../_lib/require-owner";
import { requireClubOperational } from "../../../../../../_lib/require-club-operational";
import { findOwnedCategory } from "../../../../../../_lib/find-owned-category";
import { lockGroups } from "@/core/tournaments/services/groups.service";
import { POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const lockGroupsMock = lockGroups as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ tournamentId: "tourney_1", categoryId: "cat_1" }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/groups/lock",
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

describe("POST /api/clubs/tournaments/[tournamentId]/categories/[categoryId]/groups/lock", () => {
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
    expect(lockGroupsMock).not.toHaveBeenCalled();
  });

  it("locks the groups when owned", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    lockGroupsMock.mockResolvedValue(undefined);

    const response = await POST(makeRequest(), makeParams());

    expect(lockGroupsMock).toHaveBeenCalledWith("cat_1", "user_1");
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    lockGroupsMock.mockRejectedValue(
      new Error("Create groups before locking."),
    );

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Create groups before locking.");
  });
});

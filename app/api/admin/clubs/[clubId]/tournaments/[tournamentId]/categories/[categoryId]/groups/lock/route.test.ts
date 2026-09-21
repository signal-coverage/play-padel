import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../../../_lib/require-admin-club", () => ({
  requireAdminClub: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("@/app/api/clubs/_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/groups.service", () => ({
  lockGroups: vi.fn(),
}));

import { requireAdminClub } from "../../../../../_lib/require-admin-club";
import { requireClubOperational } from "@/app/api/clubs/_lib/require-club-operational";
import { findOwnedCategory } from "@/app/api/clubs/_lib/find-owned-category";
import { lockGroups } from "@/core/tournaments/services/groups.service";
import { POST } from "./route";

const requireAdminClubMock = requireAdminClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const lockGroupsMock = lockGroups as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({
      clubId: "club_1",
      tournamentId: "tourney_1",
      categoryId: "cat_1",
    }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/admin/clubs/club_1/tournaments/tourney_1/categories/cat_1/groups/lock",
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

describe("POST /api/admin/clubs/[clubId]/tournaments/[tournamentId]/categories/[categoryId]/groups/lock", () => {
  it("returns the admin-club check's own response when it fails", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireAdminClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await POST(makeRequest(), makeParams());

    expect(response).toBe(forbidden);
    expect(lockGroupsMock).not.toHaveBeenCalled();
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
    expect(lockGroupsMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(lockGroupsMock).not.toHaveBeenCalled();
  });

  it("locks the groups with the admin's userId", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    lockGroupsMock.mockResolvedValue(undefined);

    const response = await POST(makeRequest(), makeParams());

    expect(lockGroupsMock).toHaveBeenCalledWith("cat_1", "admin_1");
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    lockGroupsMock.mockRejectedValue(new Error("Something went wrong"));

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Something went wrong");
  });
});

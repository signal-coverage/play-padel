import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../../../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("../../../../../_lib/find-owned-category", () => ({
  findOwnedCategory: vi.fn(),
}));

vi.mock("@/core/tournaments/services/groups.service", () => ({
  setGroupsManually: vi.fn(),
  generateGroupsAutomatically: vi.fn(),
  listGroupsForCategory: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../_lib/require-owner";
import { requireClubOperational } from "../../../../../_lib/require-club-operational";
import { findOwnedCategory } from "../../../../../_lib/find-owned-category";
import {
  setGroupsManually,
  generateGroupsAutomatically,
  listGroupsForCategory,
} from "@/core/tournaments/services/groups.service";
import { GET, POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCategoryMock = findOwnedCategory as ReturnType<typeof vi.fn>;
const setGroupsManuallyMock = setGroupsManually as ReturnType<typeof vi.fn>;
const listGroupsForCategoryMock = listGroupsForCategory as ReturnType<
  typeof vi.fn
>;
const generateGroupsAutomaticallyMock =
  generateGroupsAutomatically as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ tournamentId: "tourney_1", categoryId: "cat_1" }),
  };
}

function makeRequest(body: unknown) {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/groups",
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

describe("POST /api/clubs/tournaments/[tournamentId]/categories/[categoryId]/groups", () => {
  it("returns 403 when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_mp_not_connected" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await POST(makeRequest({ mode: "auto" }), makeParams());

    expect(response).toBe(forbidden);
    expect(findOwnedCategoryMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ mode: "auto" }), makeParams());

    expect(response.status).toBe(404);
    expect(generateGroupsAutomaticallyMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });

    const response = await POST(makeRequest({ mode: "bogus" }), makeParams());

    expect(response.status).toBe(400);
  });

  it("dispatches to generateGroupsAutomatically for mode=auto", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    generateGroupsAutomaticallyMock.mockResolvedValue(undefined);

    const response = await POST(makeRequest({ mode: "auto" }), makeParams());

    expect(generateGroupsAutomaticallyMock).toHaveBeenCalledWith(
      "cat_1",
      "user_1",
    );
    expect(setGroupsManuallyMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("dispatches to setGroupsManually for mode=manual", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    setGroupsManuallyMock.mockResolvedValue(undefined);

    const groups = [{ groupName: "Group A", teamIds: ["t1", "t2"] }];
    const response = await POST(
      makeRequest({ mode: "manual", groups }),
      makeParams(),
    );

    expect(setGroupsManuallyMock).toHaveBeenCalledWith(
      "cat_1",
      groups,
      "user_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 with the thrown error's message on conflict", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    generateGroupsAutomaticallyMock.mockRejectedValue(
      new Error("This category has no registered teams to group."),
    );

    const response = await POST(makeRequest({ mode: "auto" }), makeParams());
    const responseBody = await response.json();

    expect(response.status).toBe(409);
    expect(responseBody.error).toBe(
      "This category has no registered teams to group.",
    );
  });
});

function makeGetRequest() {
  return new Request(
    "http://localhost/api/clubs/tournaments/tourney_1/categories/cat_1/groups",
  ) as unknown as Parameters<typeof GET>[0];
}

describe("GET /api/clubs/tournaments/[tournamentId]/categories/[categoryId]/groups", () => {
  it("returns 404 when the category isn't owned by this club", async () => {
    findOwnedCategoryMock.mockResolvedValue(null);

    const response = await GET(makeGetRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(listGroupsForCategoryMock).not.toHaveBeenCalled();
  });

  it("returns the category's groups when owned", async () => {
    findOwnedCategoryMock.mockResolvedValue({ id: "cat_1" });
    listGroupsForCategoryMock.mockResolvedValue([
      { id: "group_a", name: "Group A", teamIds: ["t1", "t2"] },
    ]);

    const response = await GET(makeGetRequest(), makeParams());
    const body = await response.json();

    expect(listGroupsForCategoryMock).toHaveBeenCalledWith("cat_1");
    expect(response.status).toBe(200);
    expect(body.groups).toHaveLength(1);
  });
});

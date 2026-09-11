import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/requireAuthUser", () => ({
  requireAuthUser: vi.fn(),
}));

vi.mock("@/core/tournaments/services/standings.service", () => ({
  getCategoryStandingsDetail: vi.fn(),
}));

import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { getCategoryStandingsDetail } from "@/core/tournaments/services/standings.service";
import { GET } from "./route";

const requireAuthUserMock = requireAuthUser as ReturnType<typeof vi.fn>;
const getCategoryStandingsDetailMock = getCategoryStandingsDetail as ReturnType<
  typeof vi.fn
>;

function makeParams() {
  return {
    params: Promise.resolve({ tournamentId: "tourney_1", categoryId: "cat_1" }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/tournaments/tourney_1/categories/cat_1/standings",
  ) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthUserMock.mockResolvedValue({ ok: true, userId: "user_1" });
});

describe("GET /api/tournaments/[tournamentId]/categories/[categoryId]/standings", () => {
  it("returns the auth failure response when unauthenticated", async () => {
    const unauthorized = NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
      },
    );
    requireAuthUserMock.mockResolvedValue({
      ok: false,
      response: unauthorized,
    });

    const response = await GET(makeRequest(), makeParams());

    expect(response).toBe(unauthorized);
    expect(getCategoryStandingsDetailMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the category doesn't exist", async () => {
    getCategoryStandingsDetailMock.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
  });

  it("returns the category's standings detail", async () => {
    getCategoryStandingsDetailMock.mockResolvedValue({
      groups: [],
      knockoutRounds: [],
    });

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(getCategoryStandingsDetailMock).toHaveBeenCalledWith("cat_1");
    expect(response.status).toBe(200);
    expect(body.groups).toEqual([]);
    expect(body.knockoutRounds).toEqual([]);
  });
});

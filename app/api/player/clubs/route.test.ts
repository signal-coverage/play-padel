import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  listActiveClubs: vi.fn(),
}));

vi.mock("@/core/courts/services/courts.service", () => ({
  getClubsAvailability: vi.fn(),
}));

vi.mock("@vercel/firewall", () => ({
  checkRateLimit: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@vercel/firewall";
import { listActiveClubs } from "@/core/clubs/services/clubs.service";
import { getClubsAvailability } from "@/core/courts/services/courts.service";
import { GET } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const listActiveClubsMock = listActiveClubs as ReturnType<typeof vi.fn>;
const getClubsAvailabilityMock = getClubsAvailability as ReturnType<
  typeof vi.fn
>;
const checkRateLimitMock = checkRateLimit as unknown as ReturnType<
  typeof vi.fn
>;

function makeRequest(date = "2026-08-20") {
  return new NextRequest(`http://localhost/api/player/clubs?date=${date}`);
}

describe("GET /api/player/clubs", () => {
  beforeEach(() => {
    authMock.mockReset();
    listActiveClubsMock.mockReset();
    getClubsAvailabilityMock.mockReset();
    checkRateLimitMock.mockReset();
    authMock.mockResolvedValue({ userId: "user_1" });
    checkRateLimitMock.mockResolvedValue({ rateLimited: false });
  });

  it("returns 429 when the shared rate limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue({ rateLimited: true });

    const response = await GET(makeRequest());

    expect(response.status).toBe(429);
    expect(listActiveClubsMock).not.toHaveBeenCalled();
  });

  it("returns only the clubs listActiveClubs resolves — the route performs no separate operational re-check, relying entirely on listActiveClubs' query-level CLUB_OPERATIONAL_WHERE filter", async () => {
    // A non-operational club is simulated by its simple absence from
    // listActiveClubs' result (that's where CLUB_OPERATIONAL_WHERE is
    // applied, at the query level) — this route must not need to know why.
    listActiveClubsMock.mockResolvedValue([
      { id: "club_operational", name: "Operational Club" },
    ]);
    getClubsAvailabilityMock.mockResolvedValue(
      new Map([
        ["club_operational", { courtCount: 2, hasAvailabilityToday: true }],
      ]),
    );

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(listActiveClubsMock).toHaveBeenCalledTimes(1);
    expect(getClubsAvailabilityMock).toHaveBeenCalledWith(
      ["club_operational"],
      expect.any(Date),
    );
    expect(body.clubs).toHaveLength(1);
    expect(body.clubs[0].id).toBe("club_operational");
  });

  it("returns an empty club list when no clubs are operational, without any extra filtering logic", async () => {
    listActiveClubsMock.mockResolvedValue([]);
    getClubsAvailabilityMock.mockResolvedValue(new Map());

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.clubs).toEqual([]);
  });
});

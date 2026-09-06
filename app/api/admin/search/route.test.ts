import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    club: { findMany: vi.fn() },
    userProfile: { findMany: vi.fn() },
    reservation: { findMany: vi.fn() },
  },
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { prisma } from "@/infrastructure/db/client";
import { NextRequest } from "next/server";
import { GET } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const clubFindManyMock = prisma.club.findMany as ReturnType<typeof vi.fn>;
const userProfileFindManyMock = prisma.userProfile.findMany as ReturnType<
  typeof vi.fn
>;
const reservationFindManyMock = prisma.reservation.findMany as ReturnType<
  typeof vi.fn
>;

function makeRequest(query = "") {
  return new NextRequest(`https://app.example.com/api/admin/search${query}`);
}

beforeEach(() => {
  requireAdminMock.mockReset();
  clubFindManyMock.mockReset();
  userProfileFindManyMock.mockReset();
  reservationFindManyMock.mockReset();
  requireAdminMock.mockResolvedValue({
    ok: true,
    context: { userId: "user_admin", displayName: "Admin" },
  });
  clubFindManyMock.mockResolvedValue([]);
  userProfileFindManyMock.mockResolvedValue([]);
  reservationFindManyMock.mockResolvedValue([]);
});

describe("GET /api/admin/search", () => {
  it("returns the auth failure response as-is when the caller is not an admin (401)", async () => {
    const unauthorized = new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401 },
    );
    requireAdminMock.mockResolvedValue({ ok: false, response: unauthorized });

    const response = await GET(makeRequest("?q=foo"));

    expect(response).toBe(unauthorized);
    expect(clubFindManyMock).not.toHaveBeenCalled();
  });

  it("returns the auth failure response as-is when the caller is not an admin (403)", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET(makeRequest("?q=foo"));

    expect(response).toBe(forbidden);
    expect(clubFindManyMock).not.toHaveBeenCalled();
  });

  it("returns empty result groups without erroring when q is missing", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ clubs: [], players: [], reservations: [] });
    expect(clubFindManyMock).not.toHaveBeenCalled();
    expect(userProfileFindManyMock).not.toHaveBeenCalled();
    expect(reservationFindManyMock).not.toHaveBeenCalled();
  });

  it("returns empty result groups without erroring when q is an empty string", async () => {
    const response = await GET(makeRequest("?q="));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ clubs: [], players: [], reservations: [] });
    expect(clubFindManyMock).not.toHaveBeenCalled();
  });

  it("runs bounded, parallel queries across clubs, players, and reservations and returns the right shape", async () => {
    clubFindManyMock.mockResolvedValue([
      {
        id: "club_1",
        name: "Padel Norte",
        email: "norte@example.com",
        status: "ACTIVE",
      },
    ]);
    userProfileFindManyMock.mockResolvedValue([
      { id: "user_1", displayName: "Juan Perez", email: "juan@example.com" },
    ]);
    reservationFindManyMock.mockResolvedValue([
      {
        id: "res_1",
        courtName: "Court 1",
        clubId: "club_1",
        userName: "Juan Perez",
        scheduledStart: new Date("2026-09-10T10:00:00.000Z"),
        status: "CONFIRMED",
      },
    ]);

    const response = await GET(makeRequest("?q=Juan"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(clubFindManyMock).toHaveBeenCalledTimes(1);
    expect(userProfileFindManyMock).toHaveBeenCalledTimes(1);
    expect(reservationFindManyMock).toHaveBeenCalledTimes(1);
    // Bounded to ~10 results per category.
    expect(clubFindManyMock.mock.calls[0][0]).toMatchObject({ take: 10 });
    expect(userProfileFindManyMock.mock.calls[0][0]).toMatchObject({
      take: 10,
      where: expect.objectContaining({ role: "player" }),
    });
    expect(reservationFindManyMock.mock.calls[0][0]).toMatchObject({
      take: 10,
    });

    expect(body).toEqual({
      clubs: [
        {
          id: "club_1",
          name: "Padel Norte",
          email: "norte@example.com",
          status: "ACTIVE",
        },
      ],
      players: [
        { id: "user_1", displayName: "Juan Perez", email: "juan@example.com" },
      ],
      reservations: [
        {
          id: "res_1",
          courtName: "Court 1",
          clubId: "club_1",
          playerName: "Juan Perez",
          scheduledStart: "2026-09-10T10:00:00.000Z",
          status: "CONFIRMED",
        },
      ],
    });
  });

  it("matches on an exact id even when it does not substring-match name/email fields", async () => {
    await GET(makeRequest("?q=club_abc123"));

    const clubWhere = clubFindManyMock.mock.calls[0][0].where;
    expect(clubWhere.OR).toContainEqual({ id: "club_abc123" });

    const playerWhere = userProfileFindManyMock.mock.calls[0][0].where;
    expect(playerWhere.OR).toContainEqual({ id: "club_abc123" });

    const reservationWhere = reservationFindManyMock.mock.calls[0][0].where;
    expect(reservationWhere.OR).toContainEqual({ id: "club_abc123" });
  });

  it("uses case-insensitive contains matching for name/email/courtName fields", async () => {
    await GET(makeRequest("?q=norte"));

    const clubWhere = clubFindManyMock.mock.calls[0][0].where;
    expect(clubWhere.OR).toContainEqual({
      name: { contains: "norte", mode: "insensitive" },
    });
    expect(clubWhere.OR).toContainEqual({
      email: { contains: "norte", mode: "insensitive" },
    });
  });
});

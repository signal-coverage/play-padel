import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { findMany: vi.fn() },
  },
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { prisma } from "@/infrastructure/db/client";
import { GET } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const findManyMock = prisma.reservation.findMany as ReturnType<typeof vi.fn>;

describe("GET /api/admin/export/reservations", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    findManyMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET();

    expect(response).toBe(forbidden);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("joins in the club name and returns a CSV attachment for authorized admins", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin" },
    });
    findManyMock.mockResolvedValue([
      {
        id: "res_1",
        courtId: "court_1",
        courtName: "Court 1",
        clubId: "club_1",
        club: { name: "Club Padel Norte" },
        userId: "player_a",
        userName: "Ana Garcia",
        scheduledStart: new Date("2026-09-10T14:00:00.000Z"),
        scheduledEnd: new Date("2026-09-10T15:30:00.000Z"),
        status: "CONFIRMED",
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
      },
    ]);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reservations-export-2026-09-04.csv"',
    );
    expect(body).toBe(
      "id,courtId,courtName,clubId,clubName,playerId,playerName,scheduledStart,scheduledEnd,status,createdAt\r\n" +
        "res_1,court_1,Court 1,club_1,Club Padel Norte,player_a,Ana Garcia,2026-09-10T14:00:00.000Z,2026-09-10T15:30:00.000Z,CONFIRMED,2026-09-01T00:00:00.000Z",
    );
  });

  it("requests the club relation's name via include", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin" },
    });
    findManyMock.mockResolvedValue([]);

    await GET();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { club: { select: { name: true } } },
      }),
    );
  });
});

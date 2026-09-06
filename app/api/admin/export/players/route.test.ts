import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: { findMany: vi.fn() },
  },
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { prisma } from "@/infrastructure/db/client";
import { GET } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const findManyMock = prisma.userProfile.findMany as ReturnType<typeof vi.fn>;

describe("GET /api/admin/export/players", () => {
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

  it("queries only role: player and returns a CSV attachment for authorized admins", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin" },
    });
    findManyMock.mockResolvedValue([
      {
        id: "player_a",
        displayName: "Ana Garcia",
        email: "ana@example.com",
        phone: "+541100000000",
        padelCategory: 3,
        preferredSide: "forehand",
        dominantHand: "right",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const response = await GET();
    const body = await response.text();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: "player" } }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="players-export-2026-09-04.csv"',
    );
    expect(body).toBe(
      "id,displayName,email,phone,padelCategory,preferredSide,dominantHand,createdAt\r\n" +
        "player_a,Ana Garcia,ana@example.com,+541100000000,3,forehand,right,2026-01-01T00:00:00.000Z",
    );
  });

  it("renders null optional fields as empty CSV cells", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin" },
    });
    findManyMock.mockResolvedValue([
      {
        id: "player_b",
        displayName: "Bruno Diaz",
        email: "bruno@example.com",
        phone: null,
        padelCategory: null,
        preferredSide: null,
        dominantHand: null,
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);

    const response = await GET();
    const body = await response.text();

    expect(body).toBe(
      "id,displayName,email,phone,padelCategory,preferredSide,dominantHand,createdAt\r\n" +
        "player_b,Bruno Diaz,bruno@example.com,,,,,2026-02-01T00:00:00.000Z",
    );
  });
});

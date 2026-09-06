import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    club: { findMany: vi.fn() },
  },
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { prisma } from "@/infrastructure/db/client";
import { GET } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const findManyMock = prisma.club.findMany as ReturnType<typeof vi.fn>;

describe("GET /api/admin/export/clubs", () => {
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

  it("returns a CSV attachment with the correct headers and body for authorized admins", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin" },
    });
    findManyMock.mockResolvedValue([
      {
        id: "club_1",
        name: "Club Padel Norte",
        legalName: "Padel Norte SA",
        email: "norte@example.com",
        phone: "+541100000000",
        status: "ACTIVE",
        plan: "PRO",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="clubs-export-2026-09-04.csv"',
    );
    expect(body).toBe(
      "id,name,legalName,email,phone,status,plan,createdAt\r\n" +
        "club_1,Club Padel Norte,Padel Norte SA,norte@example.com,+541100000000,ACTIVE,PRO,2026-01-01T00:00:00.000Z",
    );
  });

  it("returns just the header row when there are no clubs", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin", displayName: "Admin" },
    });
    findManyMock.mockResolvedValue([]);

    const response = await GET();
    const body = await response.text();

    expect(body).toBe("id,name,legalName,email,phone,status,plan,createdAt");
  });
});

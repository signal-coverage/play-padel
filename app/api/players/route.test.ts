import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { GET } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const findManyMock = prisma.userProfile.findMany as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;

const PLAYER_ROWS = [
  {
    id: "user_1",
    displayName: "Ana",
    photoURL: null,
    padelCategory: 5,
    preferredSide: "forehand",
    dominantHand: "right",
    email: "ana@example.com",
    phone: "+541100000000",
  },
];

describe("GET /api/players", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue(PLAYER_ROWS);
  });

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("strips email and phone for a non-admin caller", async () => {
    authMock.mockResolvedValue({ userId: "user_2" });
    findUniqueMock.mockResolvedValue({ isAdmin: false });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.players[0].email).toBeUndefined();
    expect(body.players[0].phone).toBeUndefined();
    expect(body.players[0].displayName).toBe("Ana");
  });

  it("includes email and phone for an admin caller", async () => {
    authMock.mockResolvedValue({ userId: "user_admin" });
    findUniqueMock.mockResolvedValue({ isAdmin: true });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.players[0].email).toBe("ana@example.com");
    expect(body.players[0].phone).toBe("+541100000000");
  });

  it("strips email and phone when the caller's profile can't be found (treated as non-admin)", async () => {
    authMock.mockResolvedValue({ userId: "user_ghost" });
    findUniqueMock.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.players[0].email).toBeUndefined();
    expect(body.players[0].phone).toBeUndefined();
  });
});

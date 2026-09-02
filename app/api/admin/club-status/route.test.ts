import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    club: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { GET, PATCH } from "./route";

const findUniqueMock = prisma.club.findUnique as ReturnType<typeof vi.fn>;
const updateMock = prisma.club.update as ReturnType<typeof vi.fn>;

function makeGetRequest(authHeader?: string, clubId?: string) {
  const url = new URL("https://app.example.com/api/admin/club-status");
  if (clubId !== undefined) {
    url.searchParams.set("clubId", clubId);
  }
  return new Request(url, {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

function makePatchRequest(authHeader: string | undefined, body: unknown) {
  return new Request("https://app.example.com/api/admin/club-status", {
    method: "PATCH",
    headers: {
      ...(authHeader ? { authorization: authHeader } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("MEMBERSHIP_ADMIN_SECRET", "test-admin-secret");
  findUniqueMock.mockReset();
  updateMock.mockReset();
});

describe("GET /api/admin/club-status", () => {
  it("rejects requests without the correct static-secret bearer token", async () => {
    const response = await GET(makeGetRequest("Bearer wrong-secret", "club-1"));

    expect(response.status).toBe(401);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects requests with no authorization header at all", async () => {
    const response = await GET(makeGetRequest(undefined, "club-1"));

    expect(response.status).toBe(401);
  });

  it("rejects requests missing the clubId query param with 400", async () => {
    const response = await GET(makeGetRequest("Bearer test-admin-secret"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "clubId is required" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the club does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await GET(
      makeGetRequest("Bearer test-admin-secret", "missing-club"),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Club not found" });
  });

  it("returns the club when authorized and found", async () => {
    const club = {
      id: "club-1",
      name: "Padel Club",
      status: "ACTIVE",
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    findUniqueMock.mockResolvedValue(club);

    const response = await GET(
      makeGetRequest("Bearer test-admin-secret", "club-1"),
    );
    const body = await response.json();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "club-1" },
      select: {
        id: true,
        name: true,
        status: true,
        updatedBy: true,
        updatedAt: true,
      },
    });
    expect(response.status).toBe(200);
    expect(body.club).toEqual({
      ...club,
      updatedAt: club.updatedAt.toISOString(),
    });
  });
});

describe("PATCH /api/admin/club-status", () => {
  it("rejects requests without the correct static-secret bearer token", async () => {
    const response = await PATCH(
      makePatchRequest("Bearer wrong-secret", {
        clubId: "club-1",
        status: "SUSPENDED",
        updatedBy: "admin@example.com",
      }),
    );

    expect(response.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid status enum value with 400", async () => {
    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        clubId: "club-1",
        status: "BANNED",
        updatedBy: "admin@example.com",
      }),
    );

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a missing updatedBy with 400 — no admin-role auth exists to derive it from", async () => {
    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        clubId: "club-1",
        status: "SUSPENDED",
      }),
    );

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON bodies with 400 instead of throwing", async () => {
    const request = new Request(
      "https://app.example.com/api/admin/club-status",
      {
        method: "PATCH",
        headers: {
          authorization: "Bearer test-admin-secret",
          "content-type": "application/json",
        },
        body: "not json",
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });

  it("returns 404 when the club doesn't exist", async () => {
    updateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
      }),
    );

    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        clubId: "missing-club",
        status: "SUSPENDED",
        updatedBy: "admin@example.com",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Club not found" });
  });

  it("updates and returns the club on success", async () => {
    const club = {
      id: "club-1",
      name: "Padel Club",
      status: "SUSPENDED",
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    updateMock.mockResolvedValue(club);

    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        clubId: "club-1",
        status: "SUSPENDED",
        updatedBy: "admin@example.com",
      }),
    );
    const body = await response.json();

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "club-1" },
      data: { status: "SUSPENDED", updatedBy: "admin@example.com" },
      select: {
        id: true,
        name: true,
        status: true,
        updatedBy: true,
        updatedAt: true,
      },
    });
    expect(response.status).toBe(200);
    expect(body.club).toEqual({
      ...club,
      updatedAt: club.updatedAt.toISOString(),
    });
  });
});

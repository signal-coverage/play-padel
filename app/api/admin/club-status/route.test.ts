import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    club: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  setClubStatus: vi.fn(),
}));

import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth/admin";
import { setClubStatus } from "@/core/clubs/services/clubs.service";
import { GET, PATCH } from "./route";

const findUniqueMock = prisma.club.findUnique as ReturnType<typeof vi.fn>;
const updateMock = prisma.club.update as ReturnType<typeof vi.fn>;
const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const requireAdminMock = requireAdmin as ReturnType<typeof vi.fn>;
const setClubStatusMock = setClubStatus as ReturnType<typeof vi.fn>;

function makeGetRequest(clubId?: string) {
  const url = new URL("https://app.example.com/api/admin/club-status");
  if (clubId !== undefined) {
    url.searchParams.set("clubId", clubId);
  }
  return new Request(url);
}

function makePatchRequest(body: unknown) {
  return new Request("https://app.example.com/api/admin/club-status", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  authMock.mockReset();
  requireAdminMock.mockReset();
  setClubStatusMock.mockReset();
  authMock.mockResolvedValue({ userId: "user_admin" });
  requireAdminMock.mockResolvedValue(null);
});

describe("GET /api/admin/club-status", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await GET(makeGetRequest("club-1"));

    expect(response.status).toBe(401);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not an admin", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await GET(makeGetRequest("club-1"));

    expect(response.status).toBe(403);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects requests missing the clubId query param with 400", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "clubId is required" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the club does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await GET(makeGetRequest("missing-club"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Club not found" });
  });

  it("returns the club when authorized as admin and found", async () => {
    const club = {
      id: "club-1",
      name: "Padel Club",
      status: "ACTIVE",
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    findUniqueMock.mockResolvedValue(club);

    const response = await GET(makeGetRequest("club-1"));
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

// The actual status-transition + conditional owner-notification logic now
// lives in setClubStatus (core/clubs/services/clubs.service.ts, see its own
// describe block for that coverage) — this route is just the HTTP glue
// around it: auth, parsing, deriving updatedBy, and mapping a null result to
// 404. Mocking setClubStatus directly (not the prisma/dispatch calls it
// makes internally) keeps this file from duplicating that coverage.
describe("PATCH /api/admin/club-status", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await PATCH(
      makePatchRequest({
        clubId: "club-1",
        status: "SUSPENDED",
      }),
    );

    expect(response.status).toBe(401);
    expect(setClubStatusMock).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not an admin", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await PATCH(
      makePatchRequest({
        clubId: "club-1",
        status: "SUSPENDED",
      }),
    );

    expect(response.status).toBe(403);
    expect(setClubStatusMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid status enum value with 400", async () => {
    const response = await PATCH(
      makePatchRequest({
        clubId: "club-1",
        status: "BANNED",
      }),
    );

    expect(response.status).toBe(400);
    expect(setClubStatusMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON bodies with 400 instead of throwing", async () => {
    const request = new Request(
      "https://app.example.com/api/admin/club-status",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "not json",
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });

  it("returns 404 when setClubStatus reports the club doesn't exist", async () => {
    setClubStatusMock.mockResolvedValue(null);

    const response = await PATCH(
      makePatchRequest({
        clubId: "missing-club",
        status: "SUSPENDED",
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
    setClubStatusMock.mockResolvedValue(club);

    const response = await PATCH(
      makePatchRequest({
        clubId: "club-1",
        status: "SUSPENDED",
      }),
    );
    const body = await response.json();

    expect(setClubStatusMock).toHaveBeenCalledWith(
      "club-1",
      "SUSPENDED",
      "user_admin",
    );
    expect(response.status).toBe(200);
    expect(body.club).toEqual({
      ...club,
      updatedAt: club.updatedAt.toISOString(),
    });
  });

  it("derives updatedBy from the authenticated admin's own userId, ignoring any updatedBy the client sends in the body", async () => {
    setClubStatusMock.mockResolvedValue({
      id: "club-1",
      name: "Padel Club",
      status: "SUSPENDED",
      updatedBy: "user_admin",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await PATCH(
      makePatchRequest({
        clubId: "club-1",
        status: "SUSPENDED",
        // A malicious/careless client trying to spoof a different actor —
        // must be ignored entirely in favor of the real session's userId.
        updatedBy: "someone_else",
      }),
    );

    expect(setClubStatusMock).toHaveBeenCalledWith(
      "club-1",
      "SUSPENDED",
      "user_admin",
    );
  });
});

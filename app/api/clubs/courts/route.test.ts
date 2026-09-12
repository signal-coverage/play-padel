import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

// vi.importActual below executes the real courts.service module, which
// transitively imports the real infrastructure/db/client.ts — mock it so
// module-load-time DATABASE_URL validation never runs against this test's
// (unset) env.
vi.mock("@/infrastructure/db/client", () => ({
  prisma: {},
}));

vi.mock("@/core/courts/services/courts.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/core/courts/services/courts.service")
  >("@/core/courts/services/courts.service");
  return {
    DuplicateCourtNameError: actual.DuplicateCourtNameError,
    CourtLimitReachedError: actual.CourtLimitReachedError,
    createCourt: vi.fn(),
    listCourtsByClub: vi.fn(),
  };
});

import { requireOwnerClub } from "../_lib/require-owner";
import { requireClubOperational } from "../_lib/require-club-operational";
import {
  createCourt,
  DuplicateCourtNameError,
  CourtLimitReachedError,
  listCourtsByClub,
} from "@/core/courts/services/courts.service";
import { GET, POST } from "./route";
import { NextResponse } from "next/server";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const createCourtMock = createCourt as ReturnType<typeof vi.fn>;
const listCourtsByClubMock = listCourtsByClub as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/clubs/courts", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

function makeGetRequest() {
  return new NextRequest("http://localhost/api/clubs/courts");
}

describe("POST /api/clubs/courts", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    requireClubOperationalMock.mockReset();
    createCourtMock.mockReset();
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
  });

  it("returns 403 club_mp_not_connected and never creates a court when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_mp_not_connected" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await POST(makeRequest({ name: "Court 1" }));

    expect(response).toBe(forbidden);
    expect(createCourtMock).not.toHaveBeenCalled();
  });

  it("creates the court when the club is operational", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    createCourtMock.mockResolvedValue({ id: "court_1", name: "Court 1" });

    const response = await POST(makeRequest({ name: "Court 1" }));

    expect(requireClubOperationalMock).toHaveBeenCalledWith("club_1");
    expect(createCourtMock).toHaveBeenCalledWith(
      "club_1",
      expect.objectContaining({ name: "Court 1" }),
      "user_1",
    );
    expect(response.status).toBe(201);
  });

  it("returns 409 when the name is already taken in this club", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    createCourtMock.mockRejectedValue(new DuplicateCourtNameError("Court 1"));

    const response = await POST(makeRequest({ name: "Court 1" }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already exists/i);
  });

  it("returns 403 when the club has reached its plan's court limit", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    createCourtMock.mockRejectedValue(new CourtLimitReachedError("BASIC", 2));

    const response = await POST(makeRequest({ name: "Court 3" }));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/BASIC plan allows up to 2 courts/i);
  });
});

describe("GET /api/clubs/courts (ungated regardless of operational status)", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    requireClubOperationalMock.mockReset();
    listCourtsByClubMock.mockReset();
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
  });

  it("returns the owner's courts without ever calling requireClubOperational", async () => {
    listCourtsByClubMock.mockResolvedValue([{ id: "court_1" }]);

    const response = await GET(makeGetRequest());

    expect(requireClubOperationalMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

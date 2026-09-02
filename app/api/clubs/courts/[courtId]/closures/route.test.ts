import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("../../../_lib/find-owned-court", () => ({
  findOwnedCourt: vi.fn(),
}));

vi.mock("@/core/courts/services/courts.service", () => ({
  createClosure: vi.fn(),
  listClosuresByCourt: vi.fn(),
}));

import { requireOwnerClub } from "../../../_lib/require-owner";
import { requireClubOperational } from "../../../_lib/require-club-operational";
import { findOwnedCourt } from "../../../_lib/find-owned-court";
import {
  createClosure,
  listClosuresByCourt,
} from "@/core/courts/services/courts.service";
import { GET, POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCourtMock = findOwnedCourt as ReturnType<typeof vi.fn>;
const createClosureMock = createClosure as ReturnType<typeof vi.fn>;
const listClosuresByCourtMock = listClosuresByCourt as ReturnType<typeof vi.fn>;

function makeParams() {
  return { params: Promise.resolve({ courtId: "court_1" }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/clubs/courts/court_1/closures", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

function makeGetRequest() {
  return new Request(
    "http://localhost/api/clubs/courts/court_1/closures",
  ) as unknown as Parameters<typeof GET>[0];
}

const validBody = {
  startsAt: new Date(Date.now() + 60_000).toISOString(),
  endsAt: new Date(Date.now() + 120_000).toISOString(),
  reason: "Maintenance",
};

describe("POST /api/clubs/courts/[courtId]/closures", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    requireClubOperationalMock.mockReset();
    findOwnedCourtMock.mockReset();
    createClosureMock.mockReset();
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
  });

  it("returns 403 and never looks up the court when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_mp_not_connected" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await POST(makeRequest(validBody), makeParams());

    expect(response).toBe(forbidden);
    expect(findOwnedCourtMock).not.toHaveBeenCalled();
    expect(createClosureMock).not.toHaveBeenCalled();
  });

  it("creates the closure when the club is operational", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedCourtMock.mockResolvedValue({ id: "court_1" });
    createClosureMock.mockResolvedValue({ id: "closure_1" });

    const response = await POST(makeRequest(validBody), makeParams());

    expect(requireClubOperationalMock).toHaveBeenCalledWith("club_1");
    expect(createClosureMock).toHaveBeenCalled();
    expect(response.status).toBe(201);
  });
});

describe("GET /api/clubs/courts/[courtId]/closures (ungated regardless of operational status)", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    requireClubOperationalMock.mockReset();
    findOwnedCourtMock.mockReset();
    listClosuresByCourtMock.mockReset();
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    findOwnedCourtMock.mockResolvedValue({ id: "court_1" });
  });

  it("lists closures without ever calling requireClubOperational", async () => {
    listClosuresByCourtMock.mockResolvedValue([{ id: "closure_1" }]);

    const response = await GET(makeGetRequest(), makeParams());

    expect(requireClubOperationalMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

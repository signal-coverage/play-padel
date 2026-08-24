import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../../../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../../../../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("../../../../../_lib/find-owned-court", () => ({
  findOwnedCourt: vi.fn(),
}));

vi.mock("@/core/courts/services/courts.service", () => ({
  cancelClosure: vi.fn(),
}));

import { requireOwnerClub } from "../../../../../_lib/require-owner";
import { requireClubOperational } from "../../../../../_lib/require-club-operational";
import { findOwnedCourt } from "../../../../../_lib/find-owned-court";
import { cancelClosure } from "@/core/courts/services/courts.service";
import { POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCourtMock = findOwnedCourt as ReturnType<typeof vi.fn>;
const cancelClosureMock = cancelClosure as ReturnType<typeof vi.fn>;

function makeParams() {
  return {
    params: Promise.resolve({ courtId: "court_1", closureId: "closure_1" }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/clubs/courts/court_1/closures/closure_1/cancel",
    { method: "POST" },
  ) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/clubs/courts/[courtId]/closures/[closureId]/cancel", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    requireClubOperationalMock.mockReset();
    findOwnedCourtMock.mockReset();
    cancelClosureMock.mockReset();
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
  });

  it("returns 403 and never looks up the court when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_inactive" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await POST(makeRequest(), makeParams());

    expect(response).toBe(forbidden);
    expect(findOwnedCourtMock).not.toHaveBeenCalled();
    expect(cancelClosureMock).not.toHaveBeenCalled();
  });

  it("cancels the closure when the club is operational", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedCourtMock.mockResolvedValue({ id: "court_1" });
    cancelClosureMock.mockResolvedValue({
      id: "closure_1",
      status: "cancelled",
    });

    const response = await POST(makeRequest(), makeParams());

    expect(requireClubOperationalMock).toHaveBeenCalledWith("club_1");
    expect(cancelClosureMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

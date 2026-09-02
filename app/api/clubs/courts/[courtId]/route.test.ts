import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("../../_lib/require-club-operational", () => ({
  requireClubOperational: vi.fn(),
}));

vi.mock("../../_lib/find-owned-court", () => ({
  findOwnedCourt: vi.fn(),
}));

vi.mock("@/core/courts/services/courts.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/core/courts/services/courts.service")
  >("@/core/courts/services/courts.service");
  return {
    DuplicateCourtNameError: actual.DuplicateCourtNameError,
    updateCourt: vi.fn(),
    softDeleteCourt: vi.fn(),
  };
});

import { requireOwnerClub } from "../../_lib/require-owner";
import { requireClubOperational } from "../../_lib/require-club-operational";
import { findOwnedCourt } from "../../_lib/find-owned-court";
import {
  updateCourt,
  DuplicateCourtNameError,
  softDeleteCourt,
} from "@/core/courts/services/courts.service";
import { PATCH, DELETE } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCourtMock = findOwnedCourt as ReturnType<typeof vi.fn>;
const updateCourtMock = updateCourt as ReturnType<typeof vi.fn>;
const softDeleteCourtMock = softDeleteCourt as ReturnType<typeof vi.fn>;

function makeParams() {
  return { params: Promise.resolve({ courtId: "court_1" }) };
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/clubs/courts/court_1", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

describe("PATCH /api/clubs/courts/[courtId]", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    requireClubOperationalMock.mockReset();
    findOwnedCourtMock.mockReset();
    updateCourtMock.mockReset();
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

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams(),
    );

    expect(response).toBe(forbidden);
    expect(findOwnedCourtMock).not.toHaveBeenCalled();
    expect(updateCourtMock).not.toHaveBeenCalled();
  });

  it("updates the court when the club is operational", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedCourtMock.mockResolvedValue({ id: "court_1" });
    updateCourtMock.mockResolvedValue({ id: "court_1", name: "New" });

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams(),
    );

    expect(requireClubOperationalMock).toHaveBeenCalledWith("club_1");
    expect(updateCourtMock).toHaveBeenCalledWith(
      "club_1",
      "court_1",
      expect.objectContaining({ name: "New" }),
      "user_1",
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 when the new name is already taken in this club", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedCourtMock.mockResolvedValue({ id: "court_1" });
    updateCourtMock.mockRejectedValue(new DuplicateCourtNameError("New"));

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams(),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already exists/i);
  });
});

describe("DELETE /api/clubs/courts/[courtId]", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    requireClubOperationalMock.mockReset();
    findOwnedCourtMock.mockReset();
    softDeleteCourtMock.mockReset();
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

    const response = await DELETE(
      new Request("http://localhost/api/clubs/courts/court_1", {
        method: "DELETE",
      }) as unknown as Parameters<typeof DELETE>[0],
      makeParams(),
    );

    expect(response).toBe(forbidden);
    expect(findOwnedCourtMock).not.toHaveBeenCalled();
    expect(softDeleteCourtMock).not.toHaveBeenCalled();
  });

  it("deletes the court when the club is operational", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedCourtMock.mockResolvedValue({ id: "court_1" });
    softDeleteCourtMock.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost/api/clubs/courts/court_1", {
        method: "DELETE",
      }) as unknown as Parameters<typeof DELETE>[0],
      makeParams(),
    );

    expect(requireClubOperationalMock).toHaveBeenCalledWith("club_1");
    expect(softDeleteCourtMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

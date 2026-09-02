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

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

vi.mock("@/core/courts/services/courts.service", () => ({
  updateCourt: vi.fn(),
}));

vi.mock("@/core/courts/validation", () => ({
  validateCourtPhotoFile: vi.fn(),
}));

import { requireOwnerClub } from "../../../_lib/require-owner";
import { requireClubOperational } from "../../../_lib/require-club-operational";
import { findOwnedCourt } from "../../../_lib/find-owned-court";
import { put } from "@vercel/blob";
import { updateCourt } from "@/core/courts/services/courts.service";
import { validateCourtPhotoFile } from "@/core/courts/validation";
import { POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const requireClubOperationalMock = requireClubOperational as ReturnType<
  typeof vi.fn
>;
const findOwnedCourtMock = findOwnedCourt as ReturnType<typeof vi.fn>;
const putMock = put as ReturnType<typeof vi.fn>;
const updateCourtMock = updateCourt as ReturnType<typeof vi.fn>;
const validateCourtPhotoFileMock = validateCourtPhotoFile as ReturnType<
  typeof vi.fn
>;

function makeParams() {
  return { params: Promise.resolve({ courtId: "court_1" }) };
}

function makeRequest() {
  const formData = new FormData();
  formData.set(
    "photo",
    new File(["fake-bytes"], "court.jpg", { type: "image/jpeg" }),
  );
  return new Request("http://localhost/api/clubs/courts/court_1/photo", {
    method: "POST",
    body: formData,
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/clubs/courts/[courtId]/photo", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    requireClubOperationalMock.mockReset();
    findOwnedCourtMock.mockReset();
    putMock.mockReset();
    updateCourtMock.mockReset();
    validateCourtPhotoFileMock.mockReset();
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    validateCourtPhotoFileMock.mockReturnValue(null);
  });

  it("returns 403 and never uploads when the club is not operational", async () => {
    const forbidden = NextResponse.json(
      { error: "club_mp_not_connected" },
      { status: 403 },
    );
    requireClubOperationalMock.mockResolvedValue({
      ok: false,
      response: forbidden,
    });

    const response = await POST(makeRequest(), makeParams());

    expect(response).toBe(forbidden);
    expect(findOwnedCourtMock).not.toHaveBeenCalled();
    expect(putMock).not.toHaveBeenCalled();
  });

  it("uploads the photo when the club is operational", async () => {
    requireClubOperationalMock.mockResolvedValue({ ok: true });
    findOwnedCourtMock.mockResolvedValue({ id: "court_1" });
    putMock.mockResolvedValue({ url: "https://blob.example/court-1.jpg" });
    updateCourtMock.mockResolvedValue({ id: "court_1" });

    const response = await POST(makeRequest(), makeParams());

    expect(requireClubOperationalMock).toHaveBeenCalledWith("club_1");
    expect(putMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

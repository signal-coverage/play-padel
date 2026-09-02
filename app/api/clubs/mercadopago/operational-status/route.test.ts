import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/lib/mercadopago/operationalStatus", () => ({
  getClubOperationalStatus: vi.fn(),
}));

import { requireOwnerClub } from "../../_lib/require-owner";
import { getClubOperationalStatus } from "@/lib/mercadopago/operationalStatus";
import { GET } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const getClubOperationalStatusMock = getClubOperationalStatus as ReturnType<
  typeof vi.fn
>;

describe("GET /api/clubs/mercadopago/operational-status", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    getClubOperationalStatusMock.mockReset();
  });

  it("returns the auth failure response as-is when the caller is not an owner", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireOwnerClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET();

    expect(response).toBe(forbidden);
    expect(getClubOperationalStatusMock).not.toHaveBeenCalled();
  });

  it("returns operational: true, cause: null for a connected + active club", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
      email: "owner@club.com",
      nickname: "clubowner",
    });

    const response = await GET();
    const body = await response.json();

    expect(getClubOperationalStatusMock).toHaveBeenCalledWith("club_1");
    expect(response.status).toBe(200);
    expect(body).toEqual({
      operational: true,
      cause: null,
      email: "owner@club.com",
      nickname: "clubowner",
    });
  });

  it("returns operational: false, cause: MP_NOT_CONNECTED when MP is not connected", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    getClubOperationalStatusMock.mockResolvedValue({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });
  });

  it("returns operational: false, cause: CLUB_INACTIVE when the club is inactive but MP is connected", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    getClubOperationalStatusMock.mockResolvedValue({
      operational: false,
      cause: "CLUB_INACTIVE",
      email: "owner@club.com",
      nickname: "clubowner",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      operational: false,
      cause: "CLUB_INACTIVE",
      email: "owner@club.com",
      nickname: "clubowner",
    });
  });

  it("returns operational: false, cause: MP_NOT_CONNECTED when both conditions fail (precedence)", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    getClubOperationalStatusMock.mockResolvedValue({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });
  });
});

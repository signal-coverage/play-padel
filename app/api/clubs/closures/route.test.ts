import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/core/courts/services/courts.service", () => ({
  listClosuresByClub: vi.fn(),
}));

import { requireOwnerClub } from "../_lib/require-owner";
import { listClosuresByClub } from "@/core/courts/services/courts.service";
import { GET } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const listClosuresByClubMock = listClosuresByClub as ReturnType<typeof vi.fn>;

describe("GET /api/clubs/closures", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    listClosuresByClubMock.mockReset();
  });

  it("returns the caller's own club's closures", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    listClosuresByClubMock.mockResolvedValue([{ id: "closure_1" }]);

    const response = await GET();
    const body = await response.json();

    expect(listClosuresByClubMock).toHaveBeenCalledWith("club_1");
    expect(response.status).toBe(200);
    expect(body).toEqual({ closures: [{ id: "closure_1" }] });
  });

  it("returns the auth failure response and never queries closures when not an owner", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireOwnerClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET();

    expect(response).toBe(forbidden);
    expect(listClosuresByClubMock).not.toHaveBeenCalled();
  });
});

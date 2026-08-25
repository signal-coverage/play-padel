import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMercadoPagoAccount: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { requireOwnerClub } from "../../_lib/require-owner";
import { POST } from "./route";

const updateManyMock = prisma.clubMercadoPagoAccount.updateMany as ReturnType<
  typeof vi.fn
>;
const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;

describe("POST /api/clubs/mercadopago/disconnect", () => {
  beforeEach(() => {
    updateManyMock.mockReset();
    requireOwnerClubMock.mockReset();
  });

  it("clears tokens and sets status to NOT_CONNECTED for the caller's own club", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    updateManyMock.mockResolvedValue({ count: 1 });

    const response = await POST();

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club_1" },
        data: expect.objectContaining({
          status: "NOT_CONNECTED",
          accessTokenEncrypted: null,
          refreshTokenEncrypted: null,
          lastRefreshError: null,
        }),
      }),
    );
    const [[call]] = updateManyMock.mock.calls;
    expect(call.data.disconnectedAt).toBeInstanceOf(Date);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it("returns the auth failure response as-is when the caller is not an owner, without touching the DB", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireOwnerClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await POST();

    expect(response).toBe(forbidden);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("no-ops successfully when the club has no ClubMercadoPagoAccount row at all", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    // No row matches the where clause, so Prisma's updateMany resolves with
    // count: 0 instead of throwing (unlike `update`, which would throw
    // P2025 for a missing record) — that's exactly why this route uses
    // updateMany instead of update.
    updateManyMock.mockResolvedValue({ count: 0 });

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });
});

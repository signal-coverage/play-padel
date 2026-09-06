import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMercadoPagoAccount: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mercadopago/tokenCrypto", () => ({
  decryptToken: vi.fn(),
}));

vi.mock("@/lib/mercadopago/oauth", () => ({
  fetchMercadoPagoUserProfile: vi.fn(),
}));

vi.mock("@/lib/mercadopago/clubMercadoPagoClient", () => ({
  LAZY_REFRESH_WINDOW_MS: 3 * 24 * 60 * 60 * 1000,
  refreshAndPersist: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn(),
}));

import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { decryptToken } from "@/lib/mercadopago/tokenCrypto";
import { fetchMercadoPagoUserProfile } from "@/lib/mercadopago/oauth";
import { refreshAndPersist } from "@/lib/mercadopago/clubMercadoPagoClient";
import { requireAdmin } from "@/lib/auth/admin";
import { POST } from "./route";

const findManyMock = prisma.clubMercadoPagoAccount.findMany as ReturnType<
  typeof vi.fn
>;
const updateMock = prisma.clubMercadoPagoAccount.update as ReturnType<
  typeof vi.fn
>;
const decryptTokenMock = decryptToken as ReturnType<typeof vi.fn>;
const fetchProfileMock = fetchMercadoPagoUserProfile as ReturnType<
  typeof vi.fn
>;
const refreshAndPersistMock = refreshAndPersist as ReturnType<typeof vi.fn>;
const requireAdminMock = requireAdmin as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findManyMock.mockReset();
  updateMock.mockReset();
  decryptTokenMock.mockReset();
  fetchProfileMock.mockReset();
  refreshAndPersistMock.mockReset();
  requireAdminMock.mockReset();
  requireAdminMock.mockResolvedValue(null);
});

describe("POST /api/admin/mercadopago-backfill-identity", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await POST();

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not an admin", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await POST();

    expect(response.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns an empty result set when there is nothing to backfill", async () => {
    findManyMock.mockResolvedValue([]);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ checked: 0, results: [] });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("backfills an account whose token is not near expiry using decryptToken", async () => {
    const account = {
      id: "acct-1",
      clubId: "club-1",
      accessTokenEncrypted: "enc-access",
      refreshTokenEncrypted: "enc-refresh",
      tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      mpEmail: null,
      mpNickname: null,
    };
    findManyMock.mockResolvedValue([account]);
    decryptTokenMock.mockReturnValue("plain-access-token");
    fetchProfileMock.mockResolvedValue({
      email: "club@example.com",
      nickname: "club-nick",
    });
    updateMock.mockResolvedValue({});

    const response = await POST();
    const body = await response.json();

    expect(decryptTokenMock).toHaveBeenCalledWith("enc-access");
    expect(refreshAndPersistMock).not.toHaveBeenCalled();
    expect(fetchProfileMock).toHaveBeenCalledWith("plain-access-token");
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "acct-1" },
      data: { mpEmail: "club@example.com", mpNickname: "club-nick" },
    });
    expect(response.status).toBe(200);
    expect(body).toEqual({
      checked: 1,
      results: [
        {
          clubId: "club-1",
          ok: true,
          email: "club@example.com",
          nickname: "club-nick",
        },
      ],
    });
  });

  it("backfills an account whose token IS near expiry using refreshAndPersist", async () => {
    const account = {
      id: "acct-2",
      clubId: "club-2",
      accessTokenEncrypted: "enc-access-2",
      refreshTokenEncrypted: "enc-refresh-2",
      tokenExpiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      mpEmail: null,
      mpNickname: null,
    };
    findManyMock.mockResolvedValue([account]);
    refreshAndPersistMock.mockResolvedValue("fresh-access-token");
    fetchProfileMock.mockResolvedValue({
      email: "fresh@example.com",
      nickname: "fresh-nick",
    });
    updateMock.mockResolvedValue({});

    const response = await POST();
    const body = await response.json();

    expect(refreshAndPersistMock).toHaveBeenCalledWith(
      "club-2",
      "enc-refresh-2",
    );
    expect(decryptTokenMock).not.toHaveBeenCalled();
    expect(fetchProfileMock).toHaveBeenCalledWith("fresh-access-token");
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "acct-2" },
      data: { mpEmail: "fresh@example.com", mpNickname: "fresh-nick" },
    });
    expect(body.results).toEqual([
      {
        clubId: "club-2",
        ok: true,
        email: "fresh@example.com",
        nickname: "fresh-nick",
      },
    ]);
  });

  it("continues the batch when one account fails, recording both results", async () => {
    const failingAccount = {
      id: "acct-3",
      clubId: "club-3",
      accessTokenEncrypted: "enc-access-3",
      refreshTokenEncrypted: "enc-refresh-3",
      tokenExpiresAt: null,
      mpEmail: null,
      mpNickname: null,
    };
    const okAccount = {
      id: "acct-4",
      clubId: "club-4",
      accessTokenEncrypted: "enc-access-4",
      refreshTokenEncrypted: "enc-refresh-4",
      tokenExpiresAt: null,
      mpEmail: null,
      mpNickname: null,
    };
    findManyMock.mockResolvedValue([failingAccount, okAccount]);
    decryptTokenMock
      .mockReturnValueOnce("plain-access-3")
      .mockReturnValueOnce("plain-access-4");
    fetchProfileMock
      .mockRejectedValueOnce(new Error("MP profile fetch failed"))
      .mockResolvedValueOnce({ email: "ok@example.com", nickname: "ok-nick" });
    updateMock.mockResolvedValue({});

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checked).toBe(2);
    expect(body.results).toEqual([
      { clubId: "club-3", ok: false, error: "MP profile fetch failed" },
      {
        clubId: "club-4",
        ok: true,
        email: "ok@example.com",
        nickname: "ok-nick",
      },
    ]);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "acct-4" },
      data: { mpEmail: "ok@example.com", mpNickname: "ok-nick" },
    });
  });
});

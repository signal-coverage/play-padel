import { describe, it, expect, vi, beforeEach } from "vitest";
import { MercadoPagoConfig } from "mercadopago";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMercadoPagoAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("./tokenCrypto", () => ({
  decryptToken: vi.fn(),
  encryptToken: vi.fn(),
}));

vi.mock("./oauth", () => ({
  refreshClubAccessToken: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { decryptToken, encryptToken } from "./tokenCrypto";
import { refreshClubAccessToken } from "./oauth";
import {
  getClubMercadoPagoClient,
  ClubMercadoPagoConnectionError,
} from "./clubMercadoPagoClient";

const findUniqueMock = prisma.clubMercadoPagoAccount.findUnique as ReturnType<
  typeof vi.fn
>;
const updateMock = prisma.clubMercadoPagoAccount.update as ReturnType<
  typeof vi.fn
>;
const decryptTokenMock = decryptToken as ReturnType<typeof vi.fn>;
const encryptTokenMock = encryptToken as ReturnType<typeof vi.fn>;
const refreshClubAccessTokenMock = refreshClubAccessToken as ReturnType<
  typeof vi.fn
>;

function makeAccountRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "mp_acc_1",
    clubId: "club_1",
    status: "CONNECTED",
    accessTokenEncrypted: "encrypted-access",
    refreshTokenEncrypted: "encrypted-refresh",
    tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
    ...overrides,
  };
}

describe("getClubMercadoPagoClient", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset();
    decryptTokenMock.mockReset();
    encryptTokenMock.mockReset();
    refreshClubAccessTokenMock.mockReset();

    decryptTokenMock.mockImplementation((value: string) =>
      value.replace("encrypted-", "plaintext-"),
    );
    encryptTokenMock.mockImplementation((value: string) =>
      value.replace("plaintext-", "encrypted-"),
    );
  });

  it("returns a MercadoPagoConfig client built from the club's decrypted access token when far from expiry", async () => {
    findUniqueMock.mockResolvedValue(makeAccountRow());

    const client = await getClubMercadoPagoClient("club_1");

    expect(client).toBeInstanceOf(MercadoPagoConfig);
    expect(client.accessToken).toBe("plaintext-access");
    expect(refreshClubAccessTokenMock).not.toHaveBeenCalled();
  });

  it("lazily refreshes the token when it is near expiry, and returns a client built from the new token", async () => {
    findUniqueMock.mockResolvedValue(
      makeAccountRow({
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour out — inside refresh window
      }),
    );
    refreshClubAccessTokenMock.mockResolvedValue({
      access_token: "plaintext-new-access",
      refresh_token: "plaintext-new-refresh",
      expires_in: 15552000,
    });
    updateMock.mockResolvedValue(undefined);

    const client = await getClubMercadoPagoClient("club_1");

    expect(refreshClubAccessTokenMock).toHaveBeenCalledWith(
      "plaintext-refresh",
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club_1" },
        data: expect.objectContaining({
          accessTokenEncrypted: "encrypted-new-access",
          refreshTokenEncrypted: "encrypted-new-refresh",
        }),
      }),
    );
    expect(client.accessToken).toBe("plaintext-new-access");
  });

  it("throws when the club has no Mercado Pago account row", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(getClubMercadoPagoClient("club_missing")).rejects.toThrow(
      ClubMercadoPagoConnectionError,
    );
  });

  it("throws when the club's account status is NOT_CONNECTED", async () => {
    findUniqueMock.mockResolvedValue(
      makeAccountRow({ status: "NOT_CONNECTED", accessTokenEncrypted: null }),
    );

    await expect(getClubMercadoPagoClient("club_1")).rejects.toThrow(
      ClubMercadoPagoConnectionError,
    );
  });

  it("marks the club NOT_CONNECTED and throws when lazy refresh fails (e.g. revoked authorization)", async () => {
    findUniqueMock.mockResolvedValue(
      makeAccountRow({
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    );
    refreshClubAccessTokenMock.mockRejectedValue(new Error("invalid_grant"));
    updateMock.mockResolvedValue(undefined);

    await expect(getClubMercadoPagoClient("club_1")).rejects.toThrow(
      ClubMercadoPagoConnectionError,
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club_1" },
        data: expect.objectContaining({
          status: "NOT_CONNECTED",
          disconnectedAt: expect.any(Date),
          lastRefreshError: expect.any(String),
        }),
      }),
    );
  });
});

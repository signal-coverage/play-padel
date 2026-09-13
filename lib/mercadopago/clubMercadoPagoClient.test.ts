import { describe, it, expect, vi, beforeEach } from "vitest";
import { MercadoPagoConfig } from "mercadopago";

vi.mock("@/infrastructure/db/client", () => {
  const mockPrisma: {
    clubMercadoPagoAccount: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $queryRaw: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    clubMercadoPagoAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn(),
  };
  // Interactive transactions in real Prisma run every query inside the
  // callback on one dedicated connection. The mock only needs to preserve
  // that single-connection illusion: invoke the callback with the same
  // mock object so `tx.clubMercadoPagoAccount.update` in production code is
  // the exact same spy as `prisma.clubMercadoPagoAccount.update` here.
  mockPrisma.$transaction.mockImplementation(
    (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma),
  );
  return { prisma: mockPrisma };
});

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
  refreshAndPersist,
  ClubMercadoPagoConnectionError,
  CLUB_CLIENT_TIMEOUT_MS,
  CLUB_CLIENT_MAX_RETRIES,
} from "./clubMercadoPagoClient";

const findUniqueMock = prisma.clubMercadoPagoAccount.findUnique as ReturnType<
  typeof vi.fn
>;
const updateMock = prisma.clubMercadoPagoAccount.update as ReturnType<
  typeof vi.fn
>;
const queryRawMock = prisma.$queryRaw as ReturnType<typeof vi.fn>;
const transactionMock = prisma.$transaction as ReturnType<typeof vi.fn>;
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
    queryRawMock.mockReset();
    queryRawMock.mockResolvedValue(undefined);
    transactionMock.mockReset();
    transactionMock.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
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

  it("builds the client with a bounded timeout and retry budget instead of the SDK's 60s/3-retry defaults", async () => {
    findUniqueMock.mockResolvedValue(makeAccountRow());

    const client = await getClubMercadoPagoClient("club_1");

    expect(client.options).toEqual({
      timeout: CLUB_CLIENT_TIMEOUT_MS,
      maxRetries: CLUB_CLIENT_MAX_RETRIES,
    });
    expect(client.options?.timeout).toBeLessThanOrEqual(10000);
    expect(client.options?.maxRetries).toBeLessThanOrEqual(2);
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

  it("de-duplicates concurrent refreshes for the same club: two simultaneous calls trigger only one refreshClubAccessToken call and both resolve", async () => {
    findUniqueMock.mockResolvedValue(
      makeAccountRow({
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // inside refresh window
      }),
    );
    let resolveRefresh!: (value: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }) => void;
    refreshClubAccessTokenMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    updateMock.mockResolvedValue(undefined);

    const call1 = getClubMercadoPagoClient("club_1");
    const call2 = getClubMercadoPagoClient("club_1");

    // Let both calls reach the point where they'd decide whether to start
    // a refresh, before resolving the (single, shared) in-flight refresh.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    resolveRefresh({
      access_token: "plaintext-new-access",
      refresh_token: "plaintext-new-refresh",
      expires_in: 15552000,
    });

    const [client1, client2] = await Promise.all([call1, call2]);

    expect(refreshClubAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(client1.accessToken).toBe("plaintext-new-access");
    expect(client2.accessToken).toBe("plaintext-new-access");
  });

  it("does not permanently cache a refresh: a later, independent call after the first refresh settled triggers its own new refresh", async () => {
    findUniqueMock.mockResolvedValue(
      makeAccountRow({
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    );
    refreshClubAccessTokenMock
      .mockResolvedValueOnce({
        access_token: "plaintext-new-access-1",
        refresh_token: "plaintext-new-refresh-1",
        expires_in: 15552000,
      })
      .mockResolvedValueOnce({
        access_token: "plaintext-new-access-2",
        refresh_token: "plaintext-new-refresh-2",
        expires_in: 15552000,
      });
    updateMock.mockResolvedValue(undefined);

    const client1 = await getClubMercadoPagoClient("club_1");
    const client2 = await getClubMercadoPagoClient("club_1");

    expect(refreshClubAccessTokenMock).toHaveBeenCalledTimes(2);
    expect(client1.accessToken).toBe("plaintext-new-access-1");
    expect(client2.accessToken).toBe("plaintext-new-access-2");
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

describe("refreshAndPersist", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset();
    queryRawMock.mockReset();
    queryRawMock.mockResolvedValue(undefined);
    transactionMock.mockReset();
    transactionMock.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
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

  it("runs the refresh-and-persist critical section inside a single Prisma transaction", async () => {
    findUniqueMock.mockResolvedValue(
      makeAccountRow({
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // still near expiry
      }),
    );
    refreshClubAccessTokenMock.mockResolvedValue({
      access_token: "plaintext-new-access",
      refresh_token: "plaintext-new-refresh",
      expires_in: 15552000,
    });
    updateMock.mockResolvedValue(undefined);

    await refreshAndPersist("club_1", "encrypted-refresh");

    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("acquires a per-club Postgres advisory lock scoped by the club id before touching the token", async () => {
    findUniqueMock.mockResolvedValue(
      makeAccountRow({
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    );
    refreshClubAccessTokenMock.mockResolvedValue({
      access_token: "plaintext-new-access",
      refresh_token: "plaintext-new-refresh",
      expires_in: 15552000,
    });
    updateMock.mockResolvedValue(undefined);

    await refreshAndPersist("club_1", "encrypted-refresh");

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const lockCallArgs = queryRawMock.mock.calls[0];
    expect(lockCallArgs).toContain("club_1");
    // The lock must be acquired before the external refresh call and the
    // persistence write, not after — otherwise it protects nothing.
    const lockCallOrder = queryRawMock.mock.invocationCallOrder[0];
    const refreshCallOrder =
      refreshClubAccessTokenMock.mock.invocationCallOrder[0];
    const updateCallOrder = updateMock.mock.invocationCallOrder[0];
    expect(lockCallOrder).toBeLessThan(refreshCallOrder);
    expect(lockCallOrder).toBeLessThan(updateCallOrder);
  });

  it("when another instance already refreshed the token while this call was waiting on the lock, returns the fresh token instead of racing the already-rotated refresh token", async () => {
    // The outer caller decided to refresh based on a near-expiry read, but
    // by the time the advisory lock is acquired, a concurrent instance has
    // already rotated + persisted a brand new token pair.
    findUniqueMock.mockResolvedValue(
      makeAccountRow({
        accessTokenEncrypted: "encrypted-already-refreshed-access",
        refreshTokenEncrypted: "encrypted-already-refreshed-refresh",
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // far out now
      }),
    );

    const accessToken = await refreshAndPersist("club_1", "encrypted-refresh");

    expect(refreshClubAccessTokenMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(accessToken).toBe("plaintext-already-refreshed-access");
  });

  it("still performs its own refresh when the fresh re-read confirms the token is genuinely still near expiry", async () => {
    findUniqueMock.mockResolvedValue(
      makeAccountRow({
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // still near expiry
      }),
    );
    refreshClubAccessTokenMock.mockResolvedValue({
      access_token: "plaintext-new-access",
      refresh_token: "plaintext-new-refresh",
      expires_in: 15552000,
    });
    updateMock.mockResolvedValue(undefined);

    const accessToken = await refreshAndPersist("club_1", "encrypted-refresh");

    expect(refreshClubAccessTokenMock).toHaveBeenCalledWith(
      "plaintext-refresh",
    );
    expect(accessToken).toBe("plaintext-new-access");
  });
});

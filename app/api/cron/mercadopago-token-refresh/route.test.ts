import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMercadoPagoAccount: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mercadopago/clubMercadoPagoClient", () => ({
  refreshAndPersist: vi.fn(),
  ClubMercadoPagoConnectionError: class ClubMercadoPagoConnectionError extends Error {},
}));

import { prisma } from "@/infrastructure/db/client";
import {
  refreshAndPersist,
  ClubMercadoPagoConnectionError,
} from "@/lib/mercadopago/clubMercadoPagoClient";
import { GET, CRON_REFRESH_WINDOW_MS } from "./route";

const findManyMock = prisma.clubMercadoPagoAccount.findMany as ReturnType<
  typeof vi.fn
>;
const refreshAndPersistMock = refreshAndPersist as ReturnType<typeof vi.fn>;

function makeRequest(authHeader?: string) {
  return new Request(
    "https://app.example.com/api/cron/mercadopago-token-refresh",
    {
      headers: authHeader ? { authorization: authHeader } : {},
    },
  );
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  findManyMock.mockReset();
  refreshAndPersistMock.mockReset();
});

describe("GET /api/cron/mercadopago-token-refresh", () => {
  it("rejects requests without the correct CRON_SECRET bearer token", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("rejects requests with no authorization header at all", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("queries only CONNECTED accounts nearing expiry within the refresh window", async () => {
    findManyMock.mockResolvedValue([]);

    await GET(makeRequest("Bearer test-cron-secret"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "CONNECTED",
          refreshTokenEncrypted: { not: null },
          tokenExpiresAt: expect.objectContaining({
            not: null,
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it("refreshes a single due club and reports it as refreshed", async () => {
    findManyMock.mockResolvedValue([
      { clubId: "club_1", refreshTokenEncrypted: "encrypted-refresh-1" },
    ]);
    refreshAndPersistMock.mockResolvedValue("new-access-token");

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(refreshAndPersistMock).toHaveBeenCalledWith(
      "club_1",
      "encrypted-refresh-1",
    );
    expect(body).toEqual({ checked: 1, refreshed: 1, failed: 0 });
  });

  it("marks a club as failed (without throwing) when refreshAndPersist rejects, and continues the batch", async () => {
    findManyMock.mockResolvedValue([
      { clubId: "club_1", refreshTokenEncrypted: "encrypted-refresh-1" },
      { clubId: "club_2", refreshTokenEncrypted: "encrypted-refresh-2" },
    ]);
    refreshAndPersistMock
      .mockRejectedValueOnce(
        new ClubMercadoPagoConnectionError("refresh failed for club_1"),
      )
      .mockResolvedValueOnce("new-access-token-2");

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(refreshAndPersistMock).toHaveBeenCalledTimes(2);
    expect(refreshAndPersistMock).toHaveBeenNthCalledWith(
      1,
      "club_1",
      "encrypted-refresh-1",
    );
    expect(refreshAndPersistMock).toHaveBeenNthCalledWith(
      2,
      "club_2",
      "encrypted-refresh-2",
    );
    expect(body).toEqual({ checked: 2, refreshed: 1, failed: 1 });
  });

  it("handles multiple clubs where all refreshes succeed", async () => {
    findManyMock.mockResolvedValue([
      { clubId: "club_1", refreshTokenEncrypted: "encrypted-refresh-1" },
      { clubId: "club_2", refreshTokenEncrypted: "encrypted-refresh-2" },
      { clubId: "club_3", refreshTokenEncrypted: "encrypted-refresh-3" },
    ]);
    refreshAndPersistMock.mockResolvedValue("new-access-token");

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(refreshAndPersistMock).toHaveBeenCalledTimes(3);
    expect(body).toEqual({ checked: 3, refreshed: 3, failed: 0 });
  });

  it("exports a refresh window wider than the lazy-refresh window (backstop for dormant clubs)", () => {
    expect(CRON_REFRESH_WINDOW_MS).toBeGreaterThan(3 * 24 * 60 * 60 * 1000);
  });
});

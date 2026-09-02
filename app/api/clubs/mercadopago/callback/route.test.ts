import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMercadoPagoAccount: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mercadopago/oauth", () => ({
  verifyOAuthState: vi.fn(),
  exchangeAuthorizationCode: vi.fn(),
  fetchMercadoPagoUserProfile: vi.fn(),
}));

vi.mock("@/lib/mercadopago/tokenCrypto", () => ({
  encryptToken: vi.fn((value: string) => `encrypted(${value})`),
}));

import { prisma } from "@/infrastructure/db/client";
import {
  verifyOAuthState,
  exchangeAuthorizationCode,
  fetchMercadoPagoUserProfile,
} from "@/lib/mercadopago/oauth";
import { GET } from "./route";

const upsertMock = prisma.clubMercadoPagoAccount.upsert as ReturnType<
  typeof vi.fn
>;
const verifyOAuthStateMock = verifyOAuthState as ReturnType<typeof vi.fn>;
const exchangeAuthorizationCodeMock = exchangeAuthorizationCode as ReturnType<
  typeof vi.fn
>;
const fetchMercadoPagoUserProfileMock =
  fetchMercadoPagoUserProfile as ReturnType<typeof vi.fn>;

function makeRequest(query: string) {
  return new NextRequest(
    `https://app.example.com/api/clubs/mercadopago/callback${query}`,
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  upsertMock.mockReset();
  verifyOAuthStateMock.mockReset();
  exchangeAuthorizationCodeMock.mockReset();
  fetchMercadoPagoUserProfileMock.mockReset();
});

describe("GET /api/clubs/mercadopago/callback", () => {
  it("upserts a CONNECTED account and redirects to success for a valid code + state", async () => {
    verifyOAuthStateMock.mockReturnValue({ clubId: "club_1", ts: Date.now() });
    exchangeAuthorizationCodeMock.mockResolvedValue({
      access_token: "mp-access",
      refresh_token: "mp-refresh",
      expires_in: 15552000,
      user_id: 555,
      live_mode: true,
      scope: "read write",
    });
    fetchMercadoPagoUserProfileMock.mockResolvedValue({
      email: "owner@club.com",
      nickname: "clubowner",
    });
    upsertMock.mockResolvedValue(undefined);

    const response = await GET(
      makeRequest("?code=auth-code-1&state=valid-state"),
    );

    expect(verifyOAuthStateMock).toHaveBeenCalledWith("valid-state");
    expect(exchangeAuthorizationCodeMock).toHaveBeenCalledWith("auth-code-1");
    expect(fetchMercadoPagoUserProfileMock).toHaveBeenCalledWith("mp-access");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club_1" },
        update: expect.objectContaining({
          status: "CONNECTED",
          accessTokenEncrypted: "encrypted(mp-access)",
          refreshTokenEncrypted: "encrypted(mp-refresh)",
          mpEmail: "owner@club.com",
          mpNickname: "clubowner",
        }),
        create: expect.objectContaining({
          clubId: "club_1",
          status: "CONNECTED",
          accessTokenEncrypted: "encrypted(mp-access)",
          refreshTokenEncrypted: "encrypted(mp-refresh)",
          mpEmail: "owner@club.com",
          mpNickname: "clubowner",
        }),
      }),
    );
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/dashboard/courts");
    expect(location).toContain("mpConnect=success");
  });

  it("still connects the account when fetching the MP profile fails", async () => {
    verifyOAuthStateMock.mockReturnValue({ clubId: "club_1", ts: Date.now() });
    exchangeAuthorizationCodeMock.mockResolvedValue({
      access_token: "mp-access",
      refresh_token: "mp-refresh",
      expires_in: 15552000,
      user_id: 555,
      live_mode: true,
      scope: "read write",
    });
    fetchMercadoPagoUserProfileMock.mockRejectedValue(
      new Error("profile_fetch_failed"),
    );
    upsertMock.mockResolvedValue(undefined);

    const response = await GET(
      makeRequest("?code=auth-code-1&state=valid-state"),
    );

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club_1" },
        update: expect.objectContaining({
          mpEmail: null,
          mpNickname: null,
        }),
        create: expect.objectContaining({
          mpEmail: null,
          mpNickname: null,
        }),
      }),
    );
    const location = response.headers.get("location");
    expect(location).toContain("mpConnect=success");
  });

  it("rejects an invalid/tampered state without exchanging the code or touching the DB", async () => {
    verifyOAuthStateMock.mockReturnValue(null);

    const response = await GET(
      makeRequest("?code=auth-code-1&state=bad-state"),
    );

    expect(exchangeAuthorizationCodeMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    const location = response.headers.get("location");
    expect(location).toContain("mpConnect=error");
    expect(location).toContain("invalid_state");
  });

  it("leaves the club unconnected and surfaces an error when Mercado Pago reports the user denied authorization", async () => {
    const response = await GET(
      makeRequest("?error=access_denied&error_description=The+user+denied"),
    );

    expect(verifyOAuthStateMock).not.toHaveBeenCalled();
    expect(exchangeAuthorizationCodeMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    const location = response.headers.get("location");
    expect(location).toContain("mpConnect=error");
    expect(location).toContain("denied");
  });

  it("leaves the club unconnected and surfaces an error when the token exchange call fails", async () => {
    verifyOAuthStateMock.mockReturnValue({ clubId: "club_1", ts: Date.now() });
    exchangeAuthorizationCodeMock.mockRejectedValue(new Error("invalid_grant"));

    const response = await GET(makeRequest("?code=bad-code&state=valid-state"));

    expect(upsertMock).not.toHaveBeenCalled();
    const location = response.headers.get("location");
    expect(location).toContain("mpConnect=error");
    expect(location).toContain("exchange_failed");
  });

  it("rejects when code is missing even with a valid state, without exchanging or upserting", async () => {
    verifyOAuthStateMock.mockReturnValue({ clubId: "club_1", ts: Date.now() });

    const response = await GET(makeRequest("?state=valid-state"));

    expect(exchangeAuthorizationCodeMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    const location = response.headers.get("location");
    expect(location).toContain("mpConnect=error");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();
const refreshMock = vi.fn();
const getAuthorizationURLMock = vi.fn();
const configConstructorMock = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(function (config: unknown) {
    configConstructorMock(config);
    return config;
  }),
  OAuth: vi.fn().mockImplementation(function () {
    return {
      create: createMock,
      refresh: refreshMock,
      getAuthorizationURL: getAuthorizationURLMock,
    };
  }),
}));

import {
  signOAuthState,
  verifyOAuthState,
  buildMercadoPagoAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshClubAccessToken,
} from "@/lib/mercadopago/oauth";

const STATE_SECRET = "test-state-secret";

beforeEach(() => {
  vi.stubEnv("MERCADOPAGO_OAUTH_STATE_SECRET", STATE_SECRET);
  vi.stubEnv("MERCADOPAGO_OAUTH_CLIENT_ID", "client-id-123");
  vi.stubEnv("MERCADOPAGO_OAUTH_CLIENT_SECRET", "client-secret-abc");
  vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "platform-access-token");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  createMock.mockReset();
  refreshMock.mockReset();
  getAuthorizationURLMock.mockReset();
  configConstructorMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("signOAuthState / verifyOAuthState", () => {
  it("round-trips a clubId through sign then verify", () => {
    const state = signOAuthState("club_123");
    const result = verifyOAuthState(state);

    expect(result).not.toBeNull();
    expect(result?.clubId).toBe("club_123");
  });

  it("rejects a state whose payload has been tampered with", () => {
    const state = signOAuthState("club_123");
    const [encodedPayload, signature] = state.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ clubId: "club_999", ts: Date.now() }),
      "utf8",
    ).toString("base64url");
    const tampered = `${tamperedPayload}.${signature}`;

    expect(encodedPayload).not.toBe(tamperedPayload);
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rejects a state whose signature has been tampered with", () => {
    const state = signOAuthState("club_123");
    const [encodedPayload, signature] = state.split(".");
    const flippedChar = signature[0] === "a" ? "b" : "a";
    const tamperedSignature = flippedChar + signature.slice(1);

    expect(
      verifyOAuthState(`${encodedPayload}.${tamperedSignature}`),
    ).toBeNull();
  });

  it("rejects a malformed state string", () => {
    expect(verifyOAuthState("not-a-valid-state")).toBeNull();
    expect(verifyOAuthState("")).toBeNull();
    expect(verifyOAuthState("only.one.dot.too.many")).toBeNull();
  });

  it("rejects an expired state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const state = signOAuthState("club_123");

    vi.setSystemTime(new Date("2026-01-01T00:11:00Z")); // 11 minutes later, past 10-min TTL

    expect(verifyOAuthState(state)).toBeNull();
  });
});

describe("buildMercadoPagoAuthorizationUrl", () => {
  it("calls the SDK with client id, redirect uri, and the given state", () => {
    getAuthorizationURLMock.mockReturnValue(
      "https://auth.mercadopago.com/authorization?client_id=client-id-123",
    );

    const url = buildMercadoPagoAuthorizationUrl("signed-state-value");

    expect(getAuthorizationURLMock).toHaveBeenCalledWith({
      options: {
        client_id: "client-id-123",
        redirect_uri: "https://app.example.com/api/clubs/mercadopago/callback",
        state: "signed-state-value",
      },
    });
    expect(url).toBe(
      "https://auth.mercadopago.com/authorization?client_id=client-id-123",
    );
  });
});

describe("exchangeAuthorizationCode", () => {
  it("calls the SDK's OAuth.create with the expected body shape", async () => {
    createMock.mockResolvedValue({
      access_token: "APP_USR-access",
      refresh_token: "APP_USR-refresh",
      expires_in: 15552000,
      user_id: 123456,
      live_mode: true,
      scope: "read write",
    });

    const result = await exchangeAuthorizationCode("auth-code-xyz");

    expect(createMock).toHaveBeenCalledWith({
      body: {
        client_id: "client-id-123",
        client_secret: "client-secret-abc",
        code: "auth-code-xyz",
        redirect_uri: "https://app.example.com/api/clubs/mercadopago/callback",
      },
    });
    expect(result.access_token).toBe("APP_USR-access");
  });

  it("propagates errors from Mercado Pago (e.g. invalid/expired code)", async () => {
    createMock.mockRejectedValue(new Error("invalid_grant"));

    await expect(exchangeAuthorizationCode("bad-code")).rejects.toThrow(
      "invalid_grant",
    );
  });
});

describe("refreshClubAccessToken", () => {
  it("calls the SDK's OAuth.refresh with the expected body shape", async () => {
    refreshMock.mockResolvedValue({
      access_token: "APP_USR-new-access",
      refresh_token: "APP_USR-new-refresh",
      expires_in: 15552000,
    });

    const result = await refreshClubAccessToken("stored-refresh-token");

    expect(refreshMock).toHaveBeenCalledWith({
      body: {
        client_id: "client-id-123",
        client_secret: "client-secret-abc",
        refresh_token: "stored-refresh-token",
      },
    });
    expect(result.access_token).toBe("APP_USR-new-access");
  });
});

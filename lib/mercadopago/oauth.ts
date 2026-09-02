import crypto from "node:crypto";
import { MercadoPagoConfig, OAuth, User } from "mercadopago";

// CSRF-protection state param for the OAuth authorization-code flow (see
// app/api/clubs/mercadopago/connect + callback routes). The state carries
// which club initiated the connect flow and is HMAC-signed so the callback
// can trust it without a server-side session/store — it also fails a check
// if the payload has been tampered with, or is too old to still be a live
// flow.
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — generous for a redirect round-trip.

export type OAuthStatePayload = {
  clubId: string;
  ts: number;
};

// Mirrors only the fields this codebase actually reads from Mercado Pago's
// OAuth token response. Declared locally instead of importing the SDK's
// internal `OAuthResponse` type (published under a deep, non-top-level
// import path) so this module isn't coupled to the SDK's internal file
// layout.
export type MpOAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number;
  live_mode?: boolean;
  scope?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function requireAppUrl(): string {
  return requireEnv("NEXT_PUBLIC_APP_URL");
}

function getStateSecret(): string {
  return requireEnv("MERCADOPAGO_OAUTH_STATE_SECRET");
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getStateSecret())
    .update(encodedPayload)
    .digest("base64url");
}

// NOTE: this reads the platform's OWN Mercado Pago access token
// (MERCADOPAGO_ACCESS_TOKEN), NOT a club's token — Mercado Pago's OAuth SDK
// requires an authenticated caller (the marketplace application) to hit
// `/oauth/token`. This is intentionally NOT reused from `./client.ts` (the
// platform singleton slated for deletion in Phase 9) so this module has no
// import-time dependency on a file the design marks for removal. Flagged for
// Phase 9: confirm whether MERCADOPAGO_ACCESS_TOKEN can actually be retired
// given this usage, or whether the design's "retired after cutover" note
// needs revisiting.
function getPlatformMercadoPagoConfig(): MercadoPagoConfig {
  return new MercadoPagoConfig({
    accessToken: requireEnv("MERCADOPAGO_ACCESS_TOKEN"),
  });
}

function getRedirectUri(): string {
  return `${requireAppUrl()}/api/clubs/mercadopago/callback`;
}

/** Signs a state param binding an OAuth connect flow to a specific club. */
export function signOAuthState(clubId: string): string {
  const payload: OAuthStatePayload = { clubId, ts: Date.now() };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a state param produced by `signOAuthState`. Returns `null` (never
 * throws) for any malformed, tampered, or expired state so callers can treat
 * every failure mode uniformly as "reject the callback".
 */
export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  let expectedSignature: string;
  try {
    expectedSignature = signPayload(encodedPayload);
  } catch {
    return null;
  }

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload: Partial<OAuthStatePayload>;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }

  if (typeof payload.clubId !== "string" || typeof payload.ts !== "number") {
    return null;
  }

  if (Date.now() - payload.ts > STATE_TTL_MS) {
    return null;
  }

  return { clubId: payload.clubId, ts: payload.ts };
}

/** Builds the Mercado Pago authorization URL the club owner is redirected to. */
export function buildMercadoPagoAuthorizationUrl(state: string): string {
  const oauth = new OAuth(getPlatformMercadoPagoConfig());
  return oauth.getAuthorizationURL({
    options: {
      client_id: requireEnv("MERCADOPAGO_OAUTH_CLIENT_ID"),
      redirect_uri: getRedirectUri(),
      state,
    },
  });
}

/** Exchanges a one-time authorization code for an access/refresh token pair. */
export async function exchangeAuthorizationCode(
  code: string,
): Promise<MpOAuthTokenResponse> {
  const oauth = new OAuth(getPlatformMercadoPagoConfig());
  return oauth.create({
    body: {
      client_id: requireEnv("MERCADOPAGO_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("MERCADOPAGO_OAUTH_CLIENT_SECRET"),
      code,
      redirect_uri: getRedirectUri(),
    },
  });
}

export type MpUserProfile = {
  email: string | null;
  nickname: string | null;
};

/**
 * Fetches the connected account's own profile (GET /users/me) using that
 * account's access token — used only to display which Mercado Pago account
 * a club is linked to. Never call this with the platform's own token.
 */
export async function fetchMercadoPagoUserProfile(
  accessToken: string,
): Promise<MpUserProfile> {
  const user = new User(new MercadoPagoConfig({ accessToken }));
  const profile = await user.get();
  return {
    email: profile.email ?? null,
    nickname: profile.nickname ?? null,
  };
}

/** Refreshes a club's access token using its stored refresh token. */
export async function refreshClubAccessToken(
  refreshToken: string,
): Promise<MpOAuthTokenResponse> {
  const oauth = new OAuth(getPlatformMercadoPagoConfig());
  return oauth.refresh({
    body: {
      client_id: requireEnv("MERCADOPAGO_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("MERCADOPAGO_OAUTH_CLIENT_SECRET"),
      refresh_token: refreshToken,
    },
  });
}

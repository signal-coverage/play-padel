import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import {
  verifyOAuthState,
  exchangeAuthorizationCode,
  fetchMercadoPagoUserProfile,
} from "@/lib/mercadopago/oauth";
import { encryptToken } from "@/lib/mercadopago/tokenCrypto";

function requireAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return appUrl;
}

function settingsRedirect(params: Record<string, string>): NextResponse {
  const appUrl = requireAppUrl();
  const url = new URL(`${appUrl}/dashboard/courts`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

// Mercado Pago redirects the club owner's browser back here after the
// authorization step. The `state` param is the only thing binding this
// request to the club that started the flow (see connect/route.ts +
// lib/mercadopago/oauth.ts) — it is verified before anything else happens,
// and every failure mode redirects back to settings with an actionable
// `mpConnect=error` indicator instead of ever marking a club connected.
export async function GET(request: NextRequest) {
  const mpError = request.nextUrl.searchParams.get("error");
  if (mpError) {
    return settingsRedirect({ mpConnect: "error", reason: "denied" });
  }

  const state = request.nextUrl.searchParams.get("state");
  if (!state) {
    return settingsRedirect({ mpConnect: "error", reason: "missing_state" });
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    return settingsRedirect({ mpConnect: "error", reason: "invalid_state" });
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return settingsRedirect({ mpConnect: "error", reason: "missing_code" });
  }

  let tokens;
  try {
    tokens = await exchangeAuthorizationCode(code);
  } catch {
    return settingsRedirect({ mpConnect: "error", reason: "exchange_failed" });
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    return settingsRedirect({ mpConnect: "error", reason: "exchange_failed" });
  }

  const accessTokenEncrypted = encryptToken(tokens.access_token);
  const refreshTokenEncrypted = encryptToken(tokens.refresh_token);
  const tokenExpiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;
  const mpUserId = tokens.user_id != null ? String(tokens.user_id) : null;
  const liveMode = tokens.live_mode ?? false;
  const scope = tokens.scope ?? null;

  // Best-effort: this is only used to display which Mercado Pago account is
  // linked, so a failure here must never block the connection — the tokens
  // are already valid and get stored regardless.
  let mpEmail: string | null = null;
  let mpNickname: string | null = null;
  try {
    const profile = await fetchMercadoPagoUserProfile(tokens.access_token);
    mpEmail = profile.email;
    mpNickname = profile.nickname;
  } catch {
    mpEmail = null;
    mpNickname = null;
  }

  try {
    await prisma.clubMercadoPagoAccount.upsert({
      where: { clubId: verified.clubId },
      update: {
        status: "CONNECTED",
        mpUserId,
        liveMode,
        scope,
        mpEmail,
        mpNickname,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt,
        connectedAt: new Date(),
        disconnectedAt: null,
        lastRefreshError: null,
      },
      create: {
        clubId: verified.clubId,
        status: "CONNECTED",
        mpUserId,
        liveMode,
        scope,
        mpEmail,
        mpNickname,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt,
        connectedAt: new Date(),
      },
    });
  } catch {
    return settingsRedirect({ mpConnect: "error", reason: "storage_failed" });
  }

  return settingsRedirect({ mpConnect: "success" });
}

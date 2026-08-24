import { NextResponse } from "next/server";
import { requireOwnerClub } from "../../_lib/require-owner";
import {
  signOAuthState,
  buildMercadoPagoAuthorizationUrl,
} from "@/lib/mercadopago/oauth";

// Kicks off the Mercado Pago OAuth authorization-code flow for the caller's
// own club. The redirect target is signed (see lib/mercadopago/oauth.ts) so
// the callback route can trust which club initiated the flow without a
// server-side session/store.
export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const state = signOAuthState(authResult.context.clubId);
  const authorizationUrl = buildMercadoPagoAuthorizationUrl(state);

  return NextResponse.redirect(authorizationUrl);
}

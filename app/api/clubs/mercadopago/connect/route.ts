import { NextResponse } from "next/server";
import { requireOwnerClub } from "../../_lib/require-owner";
import { requireMembershipPaid } from "@/lib/mercadopago/membershipStatus";
import {
  signOAuthState,
  buildMercadoPagoAuthorizationUrl,
} from "@/lib/mercadopago/oauth";

// Kicks off the Mercado Pago OAuth authorization-code flow for the caller's
// own club. The redirect target is signed (see lib/mercadopago/oauth.ts) so
// the callback route can trust which club initiated the flow without a
// server-side session/store.
//
// Gated by membership-paid state (see spec's "MP-Connect Gated by
// Membership-Paid State" and design's "MP-connect gate" decision): a club
// must have a paid or authorized-trial membership before it can ever reach
// Mercado Pago's authorization URL. This route's own OAuth mechanics are
// otherwise unchanged from `mercadopago-club-split-payments`.
export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const membershipResult = await requireMembershipPaid(
    authResult.context.clubId,
  );
  if (!membershipResult.ok) {
    return NextResponse.json({ error: "membership_not_paid" }, { status: 403 });
  }

  const state = signOAuthState(authResult.context.clubId);
  const authorizationUrl = buildMercadoPagoAuthorizationUrl(state);

  return NextResponse.redirect(authorizationUrl);
}

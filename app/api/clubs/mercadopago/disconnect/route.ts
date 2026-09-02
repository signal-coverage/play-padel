import { NextResponse } from "next/server";
import { requireOwnerClub } from "../../_lib/require-owner";
import { prisma } from "@/infrastructure/db/client";

// Local-only "unlink" action. Mercado Pago exposes no API our app can call
// to revoke a club's authorization on their side — that can only be done by
// the seller from their own Mercado Pago account settings — so this route
// only stops trusting the stored tokens on our side: it flips the club back
// to NOT_CONNECTED and drops the ciphertext, nothing more. `lastRefreshError`
// is intentionally left untouched (stays null on the success path): this is
// an explicit user action, not a refresh failure, so the two must not be
// conflated.
//
// Uses `updateMany` (not `update`) so a club with no ClubMercadoPagoAccount
// row at all — already disconnected, or never connected — resolves with
// `count: 0` instead of throwing Prisma's P2025 "record not found". That
// makes "disconnect an already-disconnected club" a no-op success rather
// than an error case, without needing a try/catch.
export async function POST() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  await prisma.clubMercadoPagoAccount.updateMany({
    where: { clubId: authResult.context.clubId },
    data: {
      status: "NOT_CONNECTED",
      disconnectedAt: new Date(),
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      lastRefreshError: null,
    },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { decryptToken } from "@/lib/mercadopago/tokenCrypto";
import { fetchMercadoPagoUserProfile } from "@/lib/mercadopago/oauth";
import {
  LAZY_REFRESH_WINDOW_MS,
  refreshAndPersist,
} from "@/lib/mercadopago/clubMercadoPagoClient";
import { requireAdmin } from "@/lib/auth/admin";

type BackfillResult =
  | {
      clubId: string;
      ok: true;
      email: string | null;
      nickname: string | null;
    }
  | { clubId: string; ok: false; error: string };

// Backfills ClubMercadoPagoAccount.mpEmail/mpNickname for accounts that
// connected before those fields started being populated at OAuth-connect
// time (see app/api/clubs/mercadopago/callback/route.ts). Also a reusable
// maintenance endpoint: the same gap can reappear any time a club's
// identity fetch failed silently at connect time.
export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const accounts = await prisma.clubMercadoPagoAccount.findMany({
    where: {
      status: "CONNECTED",
      accessTokenEncrypted: { not: null },
      OR: [{ mpEmail: null }, { mpNickname: null }],
    },
  });

  const results: BackfillResult[] = [];

  for (const account of accounts) {
    try {
      // Mirrors getClubMercadoPagoClient's lazy-refresh decision (see
      // lib/mercadopago/clubMercadoPagoClient.ts) instead of always
      // decrypting the stored access token directly.
      let accessToken: string;
      if (
        account.tokenExpiresAt &&
        account.tokenExpiresAt.getTime() - Date.now() <=
          LAZY_REFRESH_WINDOW_MS &&
        account.refreshTokenEncrypted
      ) {
        accessToken = await refreshAndPersist(
          account.clubId,
          account.refreshTokenEncrypted,
        );
      } else {
        // Guaranteed non-null by the query filter above.
        accessToken = decryptToken(account.accessTokenEncrypted!);
      }

      const profile = await fetchMercadoPagoUserProfile(accessToken);

      await prisma.clubMercadoPagoAccount.update({
        where: { id: account.id },
        data: { mpEmail: profile.email, mpNickname: profile.nickname },
      });

      results.push({
        clubId: account.clubId,
        ok: true,
        email: profile.email,
        nickname: profile.nickname,
      });
    } catch (err) {
      // One account's failure (refresh, decrypt, or profile fetch) must
      // not abort the rest of the batch.
      results.push({
        clubId: account.clubId,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ checked: accounts.length, results });
}

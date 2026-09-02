import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/infrastructure/db/client";

export type ClubOperationalCause = "MP_NOT_CONNECTED" | "CLUB_INACTIVE";

/**
 * Query-level Prisma `where` fragment expressing "this club is operational":
 * `status === ACTIVE` AND it has a `CONNECTED` Mercado Pago account. Reused
 * by list-query call sites (`listActiveClubs`, `listCourtsByClub`) so the
 * definition of "operational" never drifts between the mutation guard, the
 * read filters, and the UI status endpoint — all of which share this module.
 */
export const CLUB_OPERATIONAL_WHERE: Prisma.ClubWhereInput = {
  status: "ACTIVE",
  mercadoPagoAccount: { status: "CONNECTED" },
};

/**
 * Single-club operational check with cause attribution, for the mutation
 * gate (`requireClubOperational`) and the owner-facing status endpoint.
 *
 * Precedence when both causes apply: MP_NOT_CONNECTED wins, since it's the
 * one with a functional CTA (connect flow) in this change — see design.md's
 * "Priority When Both Causes Apply" requirement. A club that cannot be found
 * at all is treated the same as MP_NOT_CONNECTED (fails both checks).
 */
export async function getClubOperationalStatus(clubId: string): Promise<{
  operational: boolean;
  cause: ClubOperationalCause | null;
  email: string | null;
  nickname: string | null;
}> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      status: true,
      mercadoPagoAccount: {
        select: { status: true, mpEmail: true, mpNickname: true },
      },
    },
  });

  const email = club?.mercadoPagoAccount?.mpEmail ?? null;
  const nickname = club?.mercadoPagoAccount?.mpNickname ?? null;

  const mpConnected = club?.mercadoPagoAccount?.status === "CONNECTED";
  if (!mpConnected) {
    return { operational: false, cause: "MP_NOT_CONNECTED", email, nickname };
  }

  const isActive = club?.status === "ACTIVE";
  if (!isActive) {
    return { operational: false, cause: "CLUB_INACTIVE", email, nickname };
  }

  return { operational: true, cause: null, email, nickname };
}

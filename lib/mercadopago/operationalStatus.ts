import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/infrastructure/db/client";
import type { ReservationPaymentMethod } from "@/core/reservations/types";

export type ClubOperationalCause =
  "MP_NOT_CONNECTED" | "CLUB_INACTIVE" | "PENDING_APPROVAL";

/**
 * Query-level Prisma `where` fragment expressing "this club is operational":
 * `status === ACTIVE` AND it has SOME way to get paid for reservations —
 * either a `CONNECTED` Mercado Pago account OR a configured bank transfer
 * account (`ClubBankTransferAccount`). Reused by list-query call sites
 * (`listActiveClubs`, `listCourtsByClub`) so the definition of "operational"
 * never drifts between the mutation guard, the read filters, and the UI
 * status endpoint — all of which share this module.
 */
export const CLUB_OPERATIONAL_WHERE: Prisma.ClubWhereInput = {
  status: "ACTIVE",
  OR: [
    { mercadoPagoAccount: { status: "CONNECTED" } },
    { bankTransferAccount: { isNot: null } },
  ],
};

/**
 * Single-club operational check with cause attribution, for the mutation
 * gate (`requireClubOperational`) and the owner-facing status endpoint.
 *
 * Precedence, highest first: PENDING_APPROVAL (see prisma/schema.prisma's
 * `Club.approvalStatus` — an admin-unapproved club must never accept real
 * reservations no matter what else is configured), then MP_NOT_CONNECTED,
 * then CLUB_INACTIVE. MP_NOT_CONNECTED outranks CLUB_INACTIVE since it's the
 * one with a functional CTA (connect flow) in this change — see design.md's
 * "Priority When Both Causes Apply" requirement. A club that cannot be found
 * at all is treated the same as MP_NOT_CONNECTED (fails both checks). Note
 * the cause is still literally named MP_NOT_CONNECTED even though it now
 * also covers "no bank transfer account either" — it fires whenever the club
 * has NO payout method at all, Mercado Pago or bank transfer.
 *
 * A REJECTED club currently hits the exact same PENDING_APPROVAL cause as a
 * still-PENDING one — the owner-facing UI can't yet tell the two apart
 * (intentionally out of scope for now).
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
      approvalStatus: true,
      mercadoPagoAccount: {
        select: { status: true, mpEmail: true, mpNickname: true },
      },
      bankTransferAccount: { select: { id: true } },
    },
  });

  if (club && club.approvalStatus !== "APPROVED") {
    return {
      operational: false,
      cause: "PENDING_APPROVAL",
      email: null,
      nickname: null,
    };
  }

  const email = club?.mercadoPagoAccount?.mpEmail ?? null;
  const nickname = club?.mercadoPagoAccount?.mpNickname ?? null;

  const mpConnected = club?.mercadoPagoAccount?.status === "CONNECTED";
  const hasPayoutMethod = mpConnected || Boolean(club?.bankTransferAccount);
  if (!hasPayoutMethod) {
    return { operational: false, cause: "MP_NOT_CONNECTED", email, nickname };
  }

  const isActive = club?.status === "ACTIVE";
  if (!isActive) {
    return { operational: false, cause: "CLUB_INACTIVE", email, nickname };
  }

  return { operational: true, cause: null, email, nickname };
}

/**
 * What a player can actually pay with at this club, derived from what's
 * configured — never hardcoded. A third payment method later only extends
 * this function's return list; callers never branch on club fields directly.
 * "TRANSFER" requires BOTH a ClubBankTransferAccount row AND
 * Club.whatsappNumber set (the WhatsApp number is the confirmation channel —
 * without it there's nowhere to tell the player to send their receipt).
 */
export async function getAvailablePaymentMethods(
  clubId: string,
): Promise<ReservationPaymentMethod[]> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      whatsappNumber: true,
      mercadoPagoAccount: { select: { status: true } },
      bankTransferAccount: { select: { id: true } },
    },
  });
  if (!club) return [];

  const methods: ReservationPaymentMethod[] = [];
  if (club.mercadoPagoAccount?.status === "CONNECTED") {
    methods.push("MERCADOPAGO");
  }
  if (club.bankTransferAccount && club.whatsappNumber) {
    methods.push("TRANSFER");
  }
  return methods;
}

/**
 * Batched equivalent of getAvailablePaymentMethods for a club LIST screen
 * (Browse Courts) — a single findMany instead of one findUnique per club,
 * same "batch instead of N+1" precedent as listActiveClubs' owner-photo
 * lookup in clubs.service.ts.
 */
export async function getAvailablePaymentMethodsForClubs(
  clubIds: string[],
): Promise<Map<string, ReservationPaymentMethod[]>> {
  if (clubIds.length === 0) return new Map();

  const clubs = await prisma.club.findMany({
    where: { id: { in: clubIds } },
    select: {
      id: true,
      whatsappNumber: true,
      mercadoPagoAccount: { select: { status: true } },
      bankTransferAccount: { select: { id: true } },
    },
  });

  const result = new Map<string, ReservationPaymentMethod[]>();
  for (const club of clubs) {
    const methods: ReservationPaymentMethod[] = [];
    if (club.mercadoPagoAccount?.status === "CONNECTED") {
      methods.push("MERCADOPAGO");
    }
    if (club.bankTransferAccount && club.whatsappNumber) {
      methods.push("TRANSFER");
    }
    result.set(club.id, methods);
  }
  return result;
}

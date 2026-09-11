import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/infrastructure/db/client";
import {
  MAX_RESERVATION_PARTNERS,
  PARTNER_ELIGIBLE_RESERVATION_STATUSES,
} from "@/core/reservations/consts";
import type { LatestPartnerSummary } from "@/core/reservations/types";
import type { DominantHand, PreferredSide } from "@/core/users/types";

/**
 * Validates a booker's optional co-player tags before a reservation is
 * created (see prisma/schema.prisma's ReservationPartner): at most
 * MAX_RESERVATION_PARTNERS ids, no self-tagging, and every id must be a real
 * existing UserProfile. Deliberately called BEFORE the reservation row is
 * created — a validation failure here must never leave a reservation
 * half-booked (unlike tagReservationPartners below, which runs after
 * creation and is best-effort). Returns a deduped, ready-to-tag id list;
 * `undefined`/empty input returns `[]` with no DB call — the fully
 * additive/no-op case.
 */
export async function validatePartnerIds(
  bookerId: string,
  partnerIds: string[] | undefined,
): Promise<string[]> {
  if (!partnerIds || partnerIds.length === 0) return [];

  if (partnerIds.length > MAX_RESERVATION_PARTNERS) {
    throw new Error(
      `You can tag at most ${MAX_RESERVATION_PARTNERS} partners.`,
    );
  }

  if (partnerIds.includes(bookerId)) {
    throw new Error("You can't tag yourself as a partner.");
  }

  const uniqueIds = Array.from(new Set(partnerIds));

  const existing = await prisma.userProfile.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (existing.length !== uniqueIds.length) {
    throw new Error("One or more tagged partners could not be found.");
  }

  return uniqueIds;
}

/**
 * Inserts the ReservationPartner rows for an already-created reservation.
 * Assumes `partnerIds` was already validated (validatePartnerIds above) —
 * this is a best-effort side effect run AFTER the reservation write
 * succeeds, so a failure here (e.g. a transient DB error) must not undo an
 * otherwise-successful booking. Mirrors the same swallow-and-log pattern
 * cancelReservation uses for its own post-write notifications.
 */
export async function tagReservationPartners(
  reservationId: string,
  partnerIds: string[],
): Promise<void> {
  if (partnerIds.length === 0) return;

  try {
    await prisma.reservationPartner.createMany({
      data: partnerIds.map((playerId) => ({ reservationId, playerId })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error(
      `[reservationPartners] Failed to tag partners for reservation ${reservationId}:`,
      err,
    );
    // Swallow — the reservation itself was already created successfully.
  }
}

/**
 * "Times played together" (see docs: Latest Partner spec) — count of
 * distinct eligible-status Reservation rows where either player booked and
 * tagged the other. Symmetric by construction (a co-tag between two players
 * who never booked each other never counts, even if both were tagged on a
 * third player's reservation — see decision 3's exact "either direction"
 * wording).
 */
export async function countTimesPlayedTogether(
  playerAId: string,
  playerBId: string,
): Promise<number> {
  return prisma.reservation.count({
    where: {
      status: { in: [...PARTNER_ELIGIBLE_RESERVATION_STATUSES] },
      OR: [
        { userId: playerAId, partners: { some: { playerId: playerBId } } },
        { userId: playerBId, partners: { some: { playerId: playerAId } } },
      ],
    },
  });
}

/**
 * Derives the "Latest Partner" card data for a given player (see docs:
 * Latest Partner spec, decision 4): their single most recent (by
 * scheduledStart) eligible-status Reservation that has ANY tagged-partner
 * relationship involving them, either as the booker (with tags of their own)
 * or as someone else's tagged partner. When that reservation is the
 * player's own booking with more than one tagged partner, the partner shown
 * is whichever one they've historically played with the most (tiebroken by
 * id). When the player was tagged on someone else's booking, the only
 * candidate is that booking's booker — decision 3's "times played together"
 * is only ever defined through a booker<->tagged-partner pair, so two
 * players merely co-tagged on a third party's reservation never count
 * against each other here. Returns null when the player has no partner
 * history at all.
 */
export async function getLatestPartnerForPlayer(
  playerId: string,
): Promise<LatestPartnerSummary | null> {
  const reservation = await prisma.reservation.findFirst({
    where: {
      status: { in: [...PARTNER_ELIGIBLE_RESERVATION_STATUSES] },
      OR: [
        { userId: playerId, partners: { some: {} } },
        { partners: { some: { playerId } } },
      ],
    },
    include: { partners: true },
    orderBy: { scheduledStart: "desc" },
  });

  if (!reservation) return null;

  let partnerId: string;
  if (reservation.userId === playerId) {
    const candidateIds = reservation.partners.map((p) => p.playerId);
    if (candidateIds.length === 1) {
      partnerId = candidateIds[0];
    } else {
      const withCounts = await Promise.all(
        candidateIds.map(async (id) => ({
          id,
          count: await countTimesPlayedTogether(playerId, id),
        })),
      );
      withCounts.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
      partnerId = withCounts[0].id;
    }
  } else {
    partnerId = reservation.userId;
  }

  const [timesPlayedTogether, partner] = await Promise.all([
    countTimesPlayedTogether(playerId, partnerId),
    prisma.userProfile.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        displayName: true,
        photoURL: true,
        padelCategory: true,
        preferredSide: true,
        dominantHand: true,
        email: true,
        phone: true,
      },
    }),
  ]);

  // Defensive — the FK guarantees the tagged/booking player still exists,
  // but a real UserProfile row could still be deleted out from under this.
  if (!partner) return null;

  return {
    id: partner.id,
    name: partner.displayName,
    avatarUrl: partner.photoURL,
    padelCategory: partner.padelCategory,
    preferredSide: partner.preferredSide as PreferredSide | null,
    dominantHand: partner.dominantHand as DominantHand | null,
    email: partner.email,
    phone: partner.phone,
    timesPlayedTogether,
    lastPlayedLabel: formatDistanceToNow(reservation.scheduledStart, {
      addSuffix: true,
    }),
  };
}

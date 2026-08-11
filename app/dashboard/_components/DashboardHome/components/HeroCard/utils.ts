import { format } from "date-fns";

/** Most frequent courtName, ties broken by first-seen order. "—" when empty.
 * Structurally typed (not PlayerReservation) so OwnerHero can reuse this for
 * "busiest court today" from its own ReservationRecord shape. */
export function getFavoriteCourt(reservations: { courtName: string }[]): string {
  if (reservations.length === 0) return "—";

  const counts = new Map<string, number>();
  for (const reservation of reservations) {
    counts.set(
      reservation.courtName,
      (counts.get(reservation.courtName) ?? 0) + 1,
    );
  }

  let best = reservations[0].courtName;
  let bestCount = 0;
  for (const reservation of reservations) {
    const count = counts.get(reservation.courtName) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = reservation.courtName;
    }
  }
  return best;
}

/** Total hours played across the given reservations, rounded to 1 decimal.
 * Structurally typed so OwnerHero can reuse this for "hours booked today". */
export function getHoursPlayed(
  reservations: { scheduledStart: Date; scheduledEnd: Date }[],
): number {
  const totalMs = reservations.reduce(
    (sum, r) => sum + (r.scheduledEnd.getTime() - r.scheduledStart.getTime()),
    0,
  );
  return Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10;
}

/** e.g. "Jan 2026" */
export function getMemberSinceLabel(createdAt: Date): string {
  return format(createdAt, "MMM yyyy");
}

import type { PlayerReservation } from "@/app/dashboard/my-reservations/_components/MyReservations/types";

/** Most frequent courtName, ties broken by first-seen order. "—" when empty. */
export function getFavoriteCourt(reservations: PlayerReservation[]): string {
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

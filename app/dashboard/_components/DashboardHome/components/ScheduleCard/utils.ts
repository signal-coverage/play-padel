import { format } from "date-fns";
import type { OwnerReservationSummaryDay } from "../../types";
import type { Marker } from "./types";

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function buildMarkersFromSummary(
  days: OwnerReservationSummaryDay[],
): Map<string, Marker> {
  const markers = new Map<string, Marker>();
  for (const day of days) {
    if (day.total - day.cancelled > 0) markers.set(day.date, "green");
    else if (day.total > 0) markers.set(day.date, "red");
  }
  return markers;
}

/** Non-cancelled always wins the day's marker, regardless of array order —
 * a day only reads "red" when EVERY reservation on it was cancelled. */
export function buildMarkersFromReservations(
  reservations: { status: string; scheduledStart: Date }[],
): Map<string, Marker> {
  const markers = new Map<string, Marker>();
  for (const reservation of reservations) {
    const key = dayKey(reservation.scheduledStart);
    if (reservation.status !== "CANCELLED") {
      markers.set(key, "green");
    } else if (!markers.has(key)) {
      markers.set(key, "red");
    }
  }
  return markers;
}

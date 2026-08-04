import { format, isToday, isTomorrow } from "date-fns";
import type { OwnerReservationSummaryDay } from "../../types";
import type { Marker, UpcomingItem } from "./types";

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

export type UpcomingGroup = {
  key: string;
  label: string;
  items: UpcomingItem[];
};

/** Buckets already-sorted (ascending) items into day groups, preserving order. */
export function groupUpcomingByDay(items: UpcomingItem[]): UpcomingGroup[] {
  const groups: UpcomingGroup[] = [];
  for (const item of items) {
    const key = dayKey(item.scheduledStart);
    const lastGroup = groups.at(-1);
    if (lastGroup?.key === key) {
      lastGroup.items.push(item);
    } else {
      groups.push({ key, label: dayLabel(item.scheduledStart), items: [item] });
    }
  }
  return groups;
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

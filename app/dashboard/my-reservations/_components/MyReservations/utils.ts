import { format } from "date-fns";
import type { PlayerReservation, RawPlayerReservation } from "./types";

export function toPlayerReservation(
  raw: RawPlayerReservation,
): PlayerReservation {
  return {
    ...raw,
    scheduledStart: new Date(raw.scheduledStart),
    scheduledEnd: new Date(raw.scheduledEnd),
    cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt) : undefined,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export function formatReservationDateTime(start: Date, end: Date): string {
  return `${format(start, "EEE, MMM d · h:mmaaa")} – ${format(end, "h:mmaaa")}`;
}

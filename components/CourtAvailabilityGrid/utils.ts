import { format } from "date-fns";

import { HEADER_DATE_FORMAT, TIME_LABEL_FORMAT } from "./consts";
import type {
  CourtAvailabilityGridVariant,
  CourtColumn,
  Slot,
  TimeRow,
} from "./types";

export function formatSlotTime(date: Date): string {
  return format(date, TIME_LABEL_FORMAT);
}

export function formatGridHeaderDate(date: Date): string {
  return format(date, HEADER_DATE_FORMAT);
}

/**
 * Flattens every court's slots into one sorted list of time rows so the grid
 * can render a single shared column of time labels, even if individual
 * courts don't expose a slot for every instant (e.g. a court closed early).
 */
export function buildTimeRows(courts: CourtColumn[]): TimeRow[] {
  const slotsByStartTime = new Map<number, Map<string, Slot>>();

  for (const court of courts) {
    for (const slot of court.slots) {
      const key = slot.start.getTime();
      const bucket = slotsByStartTime.get(key) ?? new Map<string, Slot>();
      bucket.set(court.id, slot);
      slotsByStartTime.set(key, bucket);
    }
  }

  return Array.from(slotsByStartTime.entries())
    .sort(([a], [b]) => a - b)
    .map(([timestamp, slotsByCourtId]) => ({
      key: String(timestamp),
      time: new Date(timestamp),
      slotsByCourtId,
    }));
}

/**
 * Free slots are interactive whenever a click handler is provided, for both
 * variants. Locked slots are only interactive for the "owner" variant, which
 * uses the click to inspect/cancel the existing reservation.
 */
export function isSlotInteractive(
  slot: Slot,
  variant: CourtAvailabilityGridVariant,
  hasClickHandler: boolean,
): boolean {
  if (!hasClickHandler) return false;
  if (slot.status === "free") return true;
  return variant === "owner";
}

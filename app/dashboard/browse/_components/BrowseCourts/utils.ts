import { createParser } from "nuqs";
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";
import type { RawCourt } from "./types";

export function toCourtColumns(raw: RawCourt[]): CourtColumn[] {
  return raw.map((court) => ({
    id: court.id,
    name: court.name,
    reservationFee: court.reservationFee,
    surface: court.surface,
    color: court.color,
    indoor: court.indoor,
    photoUrl: court.photoUrl,
    courtPrice: court.courtPrice,
    slotDurationMinutes: court.slotDurationMinutes,
    slots: court.slots.map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
      status: slot.status,
      ...(slot.reservationId && { reservationId: slot.reservationId }),
      ...(slot.closureReason && { closureReason: slot.closureReason }),
      ...(slot.waitlisted && { waitlisted: slot.waitlisted }),
    })),
  }));
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Counts distinct slot start times across all courts (mirrors how
 * `CourtAvailabilityGrid`'s `buildTimeRows` derives its row count, without
 * needing the full row objects). Used to cache a "last known" skeleton row
 * count per club so the loading state doesn't have to guess.
 */
export function countUniqueSlotStarts(courts: CourtColumn[]): number {
  const starts = new Set<number>();
  for (const court of courts) {
    for (const slot of court.slots) {
      starts.add(slot.start.getTime());
    }
  }
  return starts.size;
}

/**
 * URL-state parser for the browsed day, keyed on the same local
 * (not UTC) calendar date used everywhere else in this feature (see
 * `toDateKey`). nuqs' built-in `parseAsIsoDate` round-trips through
 * `Date#toISOString`, which reads UTC components — for timezones behind
 * UTC that silently shifts the encoded day whenever the "now" default is
 * captured in the evening, producing a `?date=` value that doesn't match
 * what's on screen. Parsing/serializing directly against local
 * year/month/day avoids that mismatch and keeps the URL human-readable.
 */
export const parseAsLocalDate = createParser({
  parse: (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.valueOf()) ? null : date;
  },
  serialize: toDateKey,
  eq: (a, b) => toDateKey(a) === toDateKey(b),
});

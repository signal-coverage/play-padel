import type { CourtColumn } from "@/components/CourtAvailabilityGrid";
import type { RawCourt } from "./types";

export function toCourtColumns(raw: RawCourt[]): CourtColumn[] {
  return raw.map((court) => ({
    id: court.id,
    name: court.name,
    slots: court.slots.map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
      status: slot.status,
      ...(slot.reservationId && { reservationId: slot.reservationId }),
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

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

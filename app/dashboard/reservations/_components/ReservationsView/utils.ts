import { format } from "date-fns";
import type { UseQueryResult } from "@tanstack/react-query";
import type { Slot } from "@/components/CourtAvailabilityGrid";
import type {
  CourtSummary,
  RawReservation,
  RawSlot,
  ReservationRecord,
} from "./types";

export const DATE_QUERY_FORMAT = "yyyy-MM-dd";
export const TIME_DISPLAY_FORMAT = "HH:mm";

/** Statuses a reservation can still transition out of. Terminal statuses
 * (CANCELLED/COMPLETED/NO_SHOW) show read-only in the UI. */
export const ACTIONABLE_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

export function dateKey(date: Date): string {
  return format(date, DATE_QUERY_FORMAT);
}

export function toSlot(raw: RawSlot): Slot {
  return {
    start: new Date(raw.start),
    end: new Date(raw.end),
    status: raw.status,
    ...(raw.reservationId && { reservationId: raw.reservationId }),
  };
}

export function toReservationRecord(raw: RawReservation): ReservationRecord {
  return {
    id: raw.id,
    courtId: raw.courtId,
    courtName: raw.courtName,
    userName: raw.userName,
    status: raw.status,
    scheduledStart: new Date(raw.scheduledStart),
    scheduledEnd: new Date(raw.scheduledEnd),
    notes: raw.notes,
  };
}

/** Combines the active-courts list with each court's parallel slots query
 * (same order, via useCourtSlotsQueries) into the CourtColumn[] shape
 * CourtAvailabilityGrid expects. */
export function buildCourtColumns(
  courts: CourtSummary[],
  slotQueries: UseQueryResult<Slot[], Error>[],
) {
  return courts.map((court, index) => ({
    id: court.id,
    name: court.name,
    slots: slotQueries[index]?.data ?? [],
  }));
}

export function buildReservationMap(
  reservations: ReservationRecord[],
): Map<string, ReservationRecord> {
  return new Map(
    reservations.map((reservation) => [reservation.id, reservation]),
  );
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${format(start, TIME_DISPLAY_FORMAT)} - ${format(end, TIME_DISPLAY_FORMAT)}`;
}

export function isActionable(status: ReservationRecord["status"]): boolean {
  return (ACTIONABLE_STATUSES as readonly string[]).includes(status);
}

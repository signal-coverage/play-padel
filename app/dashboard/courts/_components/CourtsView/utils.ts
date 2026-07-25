import { DAY_LABELS, DEFAULT_SLOT_DURATION_MINUTES } from "@/core/courts/consts";
import type { AvailabilityEntry, CourtAvailability } from "@/core/courts/types";
import type { AvailabilityDayRow, CourtFormValues, CourtRecord } from "./types";

export const DEFAULT_COURT_COLOR = "#2D8A60";

export function courtToFormValues(court?: CourtRecord | null): CourtFormValues {
  return {
    name: court?.name ?? "",
    surface: court?.surface ?? "",
    indoor: court?.indoor ?? false,
    color: court?.color ?? DEFAULT_COURT_COLOR,
    slotDurationMinutes:
      court?.slotDurationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES,
    active: court?.active ?? true,
  };
}

export function surfaceLabel(surface?: string): string {
  return surface && surface.trim().length > 0 ? surface : "—";
}

export function indoorLabel(indoor: boolean): string {
  return indoor ? "Indoor" : "Outdoor";
}

/** Builds the 7-row weekly editor state from whatever entries the server has
 * on file, defaulting unset days to inactive with a sensible 09:00-21:00
 * placeholder window so toggling them on doesn't start from an empty range. */
export function buildAvailabilityRows(
  entries: CourtAvailability[],
): AvailabilityDayRow[] {
  return DAY_LABELS.map((_, dayOfWeek) => {
    const entry = entries.find((e) => e.dayOfWeek === dayOfWeek && e.active);
    return {
      dayOfWeek,
      active: Boolean(entry),
      startTime: entry?.startTime ?? "09:00",
      endTime: entry?.endTime ?? "21:00",
    };
  });
}

export function availabilityRowsToEntries(
  rows: AvailabilityDayRow[],
): AvailabilityEntry[] {
  return rows
    .filter((row) => row.active)
    .map((row) => ({
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
    }));
}

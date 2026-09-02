import { DAY_LABELS } from "@/core/courts/consts";
import type { AvailabilityDayRow } from "@/components/AvailabilityRowsEditor";
import type { AvailabilityEntry } from "@/core/courts/types";

/**
 * Builds the 7-row weekly editor state from the club's saved operating-hours
 * entries, defaulting unset days to inactive with a sensible 09:00-21:00
 * placeholder window so toggling them on doesn't start from an empty range.
 * Local equivalent of CourtsView/utils.ts's buildAvailabilityRows — this
 * repo's convention is to duplicate a small utility like this across
 * unrelated feature folders rather than import across them.
 */
export function buildAvailabilityRows(
  entries: AvailabilityEntry[],
): AvailabilityDayRow[] {
  return DAY_LABELS.map((_, dayOfWeek) => {
    const entry = entries.find((e) => e.dayOfWeek === dayOfWeek);
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

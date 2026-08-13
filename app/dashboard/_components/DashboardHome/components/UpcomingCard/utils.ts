import { format, isToday, isTomorrow } from "date-fns";
import type { UpcomingItem } from "./types";

// Duplicated from ScheduleCard/utils.ts intentionally: UpcomingCard and
// ScheduleCard are independent sibling grid items (each fetches its own
// data), so this keeps the two folders self-contained rather than reaching
// across sibling card boundaries for a one-line date-key formatter.
function dayKey(date: Date): string {
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

import { format, isToday, isTomorrow } from "date-fns";
import type { UpcomingItem } from "./types";

// Kept as a local helper intentionally: UpcomingCard is a self-contained
// grid item (fetches its own data), so this one-line date-key formatter
// stays local rather than being shared from elsewhere.
function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// `labels` comes from the caller's own "UpcomingListItems" translations
// (dayLabel/groupUpcomingByDay are plain utils, not components, so they
// can't call useTranslations themselves) — { today, tomorrow }.
export function dayLabel(
  date: Date,
  labels: { today: string; tomorrow: string },
): string {
  if (isToday(date)) return labels.today;
  if (isTomorrow(date)) return labels.tomorrow;
  return format(date, "EEE, MMM d");
}

export type UpcomingGroup = {
  key: string;
  label: string;
  items: UpcomingItem[];
};

/** Buckets already-sorted (ascending) items into day groups, preserving order. */
export function groupUpcomingByDay(
  items: UpcomingItem[],
  labels: { today: string; tomorrow: string },
): UpcomingGroup[] {
  const groups: UpcomingGroup[] = [];
  for (const item of items) {
    const key = dayKey(item.scheduledStart);
    const lastGroup = groups.at(-1);
    if (lastGroup?.key === key) {
      lastGroup.items.push(item);
    } else {
      groups.push({
        key,
        label: dayLabel(item.scheduledStart, labels),
        items: [item],
      });
    }
  }
  return groups;
}

import {
  differenceInCalendarWeeks,
  format,
  startOfWeek,
  subWeeks,
} from "date-fns";

export function toDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Oldest-to-newest week-start dates, ending on the week containing `referenceDate`. */
export function getWeekStarts(
  weeksCount: number,
  referenceDate: Date = new Date(),
): Date[] {
  const currentWeekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  return Array.from({ length: weeksCount }, (_, index) =>
    subWeeks(currentWeekStart, weeksCount - 1 - index),
  );
}

/** Oldest-to-newest counts of `dates` bucketed into the last `weeksCount` ISO weeks. */
export function getWeeklyCounts(
  dates: Date[],
  weeksCount: number,
  referenceDate: Date = new Date(),
): number[] {
  const counts = new Array(weeksCount).fill(0);
  const currentWeekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });

  for (const date of dates) {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weeksAgo = differenceInCalendarWeeks(currentWeekStart, weekStart, {
      weekStartsOn: 1,
    });
    const index = weeksCount - 1 - weeksAgo;
    if (index >= 0 && index < weeksCount) {
      counts[index] += 1;
    }
  }

  return counts;
}

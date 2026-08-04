import { eachDayOfInterval, isSameDay, startOfDay, subDays } from "date-fns";
import { ACTIVITY_WINDOW_DAYS } from "./consts";

export function getActivityWindowDays(
  referenceDate: Date = new Date(),
): Date[] {
  const end = startOfDay(referenceDate);
  const start = subDays(end, ACTIVITY_WINDOW_DAYS - 1);
  return eachDayOfInterval({ start, end });
}

export function hasActivityOnDay(dates: Date[], day: Date): boolean {
  return dates.some((date) => isSameDay(date, day));
}

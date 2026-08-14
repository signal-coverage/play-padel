import { subWeeks } from "date-fns";
import { PLAYER_LOAD_RANGE_WEEKS, WEEKDAY_LABELS } from "./consts";

const WEEKDAY_FULL_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Monday-first weekday index (0=Mon..6=Sun). */
function getWeekdayIndex(date: Date): number {
  const day = date.getDay(); // 0 (Sun) .. 6 (Sat)
  return day === 0 ? 6 : day - 1;
}

/** Sums `weight` per weekday across `entries`, Monday-first. */
export function sumByWeekday(
  entries: { date: Date; weight: number }[],
): number[] {
  const totals = new Array(7).fill(0);
  for (const { date, weight } of entries) {
    totals[getWeekdayIndex(date)] += weight;
  }
  return totals;
}

/** Shapes weekday totals into OverviewChart's generic {date,total} datum. */
export function buildWeekdayChartData(totals: number[]) {
  return WEEKDAY_LABELS.map((label, index) => ({
    date: label,
    total: totals[index],
  }));
}

/** Full name of the highest-total weekday, ties broken by first-seen order. Null when every total is zero. */
export function getBusiestWeekdayName(totals: number[]): string | null {
  const grandTotal = totals.reduce((sum, value) => sum + value, 0);
  if (grandTotal <= 0) return null;

  let busiestIndex = 0;
  for (let index = 1; index < totals.length; index++) {
    if (totals[index] > totals[busiestIndex]) busiestIndex = index;
  }
  return WEEKDAY_FULL_NAMES[busiestIndex];
}

/** Start of the trailing player-load window (see PLAYER_LOAD_RANGE_WEEKS). */
export function getPlayerLoadWindowStart(
  referenceDate: Date = new Date(),
): Date {
  return subWeeks(referenceDate, PLAYER_LOAD_RANGE_WEEKS);
}

import { PADEL_CATEGORY_OPTIONS } from "@/app/onboarding/types";
import { WEEKDAY_LABELS } from "./consts";

export function getPadelCategoryLabel(category: number | null): string {
  if (category === null) return "Not set yet";
  const option = PADEL_CATEGORY_OPTIONS.find(
    (o) => o.value === String(category),
  );
  return option?.label ?? `Category ${category}`;
}

/** Weekday with the highest summed weight, ties broken by first-seen order. Null when every weight is zero. */
export function getBusiestWeekday(
  entries: { date: Date; weight: number }[],
): (typeof WEEKDAY_LABELS)[number] | null {
  const totals = new Array(7).fill(0);
  for (const { date, weight } of entries) {
    totals[getIsoDayIndex(date)] += weight;
  }

  const grandTotal = totals.reduce((sum, value) => sum + value, 0);
  if (grandTotal <= 0) return null;

  let busiestIndex = 0;
  for (let index = 1; index < totals.length; index++) {
    if (totals[index] > totals[busiestIndex]) busiestIndex = index;
  }

  return WEEKDAY_LABELS[busiestIndex];
}

function getIsoDayIndex(date: Date): number {
  const day = date.getDay(); // 0 (Sun) .. 6 (Sat)
  return day === 0 ? 6 : day - 1; // 0 (Mon) .. 6 (Sun)
}

const TIME_OF_DAY_LABELS = ["morning", "afternoon", "evening"] as const;

/** Most frequent time-of-day bucket (morning < 12:00, afternoon < 18:00, else evening). Null when empty. */
export function getBusiestTimeOfDay(
  dates: Date[],
): (typeof TIME_OF_DAY_LABELS)[number] | null {
  if (dates.length === 0) return null;

  const totals = [0, 0, 0];
  for (const date of dates) {
    totals[getTimeOfDayIndex(date)] += 1;
  }

  let busiestIndex = 0;
  for (let index = 1; index < totals.length; index++) {
    if (totals[index] > totals[busiestIndex]) busiestIndex = index;
  }
  return TIME_OF_DAY_LABELS[busiestIndex];
}

function getTimeOfDayIndex(date: Date): number {
  const hour = date.getHours();
  if (hour < 12) return 0;
  if (hour < 18) return 1;
  return 2;
}

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

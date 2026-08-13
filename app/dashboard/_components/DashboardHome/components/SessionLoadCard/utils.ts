import type { GaugeTone, GaugeTrend } from "./types";

/** Tone thresholds are intentionally asymmetric per metric: pass
 * `lowerIsBetter: true` for rates where a smaller percentage is the healthy
 * outcome (e.g. cancellations), `false` when a higher percentage is better
 * (e.g. weeks active). */
export function getGaugeTone(
  percent: number,
  thresholds: { good: number; watch: number },
  lowerIsBetter: boolean,
): GaugeTone {
  const passesGood = lowerIsBetter
    ? percent <= thresholds.good
    : percent >= thresholds.good;
  if (passesGood) return "good";

  const passesWatch = lowerIsBetter
    ? percent <= thresholds.watch
    : percent >= thresholds.watch;
  return passesWatch ? "watch" : "bad";
}

/** Compares the current period's percent against the previous period's.
 * Null when there's no previous-period data to compare against. */
export function buildTrend(
  currentPercent: number,
  previousPercent: number | null,
): GaugeTrend | null {
  if (previousPercent === null) return null;

  const delta = Math.round(currentPercent - previousPercent);
  return {
    direction: delta >= 0 ? "up" : "down",
    text: `${Math.abs(delta)}% vs previous period`,
  };
}

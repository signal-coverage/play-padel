import {
  CANCELLATION_RATE_GOOD_MAX,
  CANCELLATION_RATE_WATCH_MAX,
  CONSISTENCY_GREAT_MIN,
  CONSISTENCY_OKAY_MIN,
} from "./consts";
import type { UtilizationBand } from "./types";
import type { OwnerReservationSummaryDay } from "../../types";

export type CancellationRateResult = {
  percentage: number;
  displayPercentage: string;
  band: UtilizationBand;
};

export function getCancellationRate(
  days: OwnerReservationSummaryDay[],
): CancellationRateResult | null {
  const total = days.reduce((sum, day) => sum + day.total, 0);
  if (total === 0) return null;

  const cancelled = days.reduce((sum, day) => sum + day.cancelled, 0);
  const rate = cancelled / total;

  return {
    percentage: rate * 100,
    displayPercentage: `${Math.round(rate * 100)}%`,
    band: getCancellationBand(rate),
  };
}

function getCancellationBand(rate: number): UtilizationBand {
  if (rate < CANCELLATION_RATE_GOOD_MAX) {
    return {
      label: "Good",
      fillClassName: "fill-chart-2",
      textClassName: "text-chart-2",
    };
  }
  if (rate <= CANCELLATION_RATE_WATCH_MAX) {
    return {
      label: "Watch",
      fillClassName: "fill-muted-foreground",
      textClassName: "text-muted-foreground",
    };
  }
  return {
    label: "High",
    fillClassName: "fill-destructive",
    textClassName: "text-destructive",
  };
}

export type ConsistencyResult = {
  activeWeeks: number;
  totalWeeks: number;
  percentage: number;
  band: UtilizationBand;
};

/** Player's own low activity isn't an operational error, unlike a high
 * cancellation rate — no destructive-red band here, ever. */
export function getConsistency(
  activeWeeks: number,
  totalWeeks: number,
): ConsistencyResult {
  return {
    activeWeeks,
    totalWeeks,
    percentage: (activeWeeks / totalWeeks) * 100,
    band: getConsistencyBand(activeWeeks),
  };
}

function getConsistencyBand(activeWeeks: number): UtilizationBand {
  if (activeWeeks >= CONSISTENCY_GREAT_MIN) {
    return {
      label: "Great",
      fillClassName: "fill-chart-2",
      textClassName: "text-chart-2",
    };
  }
  if (activeWeeks >= CONSISTENCY_OKAY_MIN) {
    return {
      label: "Okay",
      fillClassName: "fill-muted-foreground",
      textClassName: "text-muted-foreground",
    };
  }
  return {
    label: "Low",
    fillClassName: "fill-muted-foreground",
    textClassName: "text-muted-foreground",
  };
}

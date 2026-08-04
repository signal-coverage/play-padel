import type { ChartConfig } from "@/components/ui/chart";

export const OWNER_UTILIZATION_RANGE_DAYS = 14;
export const PLAYER_CONSISTENCY_WEEKS = 8;

// Simple fixed heuristics, not a computed/ML threshold.
export const CANCELLATION_RATE_GOOD_MAX = 0.1;
export const CANCELLATION_RATE_WATCH_MAX = 0.25;
export const CONSISTENCY_GREAT_MIN = 6;
export const CONSISTENCY_OKAY_MIN = 3;

export const UTILIZATION_CHART_CONFIG: ChartConfig = {
  value: { label: "Rate" },
};

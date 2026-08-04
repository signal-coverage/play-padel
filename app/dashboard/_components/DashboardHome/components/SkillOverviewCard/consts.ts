import type { ChartConfig } from "@/components/ui/chart";

export const OWNER_RANGE_DAYS = 14;
export const PLAYER_RANGE_WEEKS = 6;

// Monday-first order, matches date-fns's ISO weekday numbering (getISODay).
export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const OVERVIEW_CHART_CONFIG: ChartConfig = {
  total: { label: "Bookings", color: "var(--chart-1)" },
};

import type { ReportPeriod, ReportData } from "@/app/actions/reports";

export type { ReportPeriod, ReportData };

export interface ReportsPageProps {}

export interface PeriodTab {
  value: ReportPeriod;
  label: string;
}

export const PERIOD_TABS: PeriodTab[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

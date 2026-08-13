"use client";

import { subDays } from "date-fns";
import { OverviewChart } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/components/OverviewChart";
import { useOwnerReservationSummary } from "../../../../hooks";
import { OWNER_LOAD_RANGE_DAYS } from "../../consts";
import {
  buildWeekdayChartData,
  getBusiestWeekdayName,
  sumByWeekday,
} from "../../utils";

export function OwnerWeeklyLoad() {
  const today = new Date();
  const from = subDays(today, OWNER_LOAD_RANGE_DAYS - 1);
  const { data: days = [] } = useOwnerReservationSummary(from, today);

  const totals = sumByWeekday(
    days.map((day) => ({ date: new Date(day.date), weight: day.total })),
  );
  const chartData = buildWeekdayChartData(totals);
  const hasActivity = totals.some((total) => total > 0);
  const busiest = getBusiestWeekdayName(totals);

  return (
    <OverviewChart
      chartData={chartData}
      hasActivity={hasActivity}
      caption={busiest ? `Most bookings happen on ${busiest}s.` : null}
      emptyMessage="Once bookings come in, we'll show your weekday distribution here."
    />
  );
}

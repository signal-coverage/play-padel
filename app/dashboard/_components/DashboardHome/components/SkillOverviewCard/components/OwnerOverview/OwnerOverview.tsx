"use client";

import { subDays } from "date-fns";
import { useOwnerReservationSummary } from "../../../../hooks";
import { OWNER_RANGE_DAYS } from "../../consts";
import { getBusiestWeekday } from "../../utils";
import { OverviewChart } from "../OverviewChart";

export function OwnerOverview() {
  const today = new Date();
  const from = subDays(today, OWNER_RANGE_DAYS - 1);
  const { data: days = [] } = useOwnerReservationSummary(from, today);

  const chartData = days.map((day) => ({ date: day.date, total: day.total }));
  const hasActivity = chartData.some((day) => day.total > 0);
  const busiest = getBusiestWeekday(
    days.map((day) => ({ date: new Date(day.date), weight: day.total })),
  );

  return (
    <OverviewChart
      chartData={chartData}
      hasActivity={hasActivity}
      caption={
        busiest ? `${busiest}s are your busiest day this period.` : null
      }
      emptyMessage="Once bookings come in, we'll show your club's busiest days here."
    />
  );
}

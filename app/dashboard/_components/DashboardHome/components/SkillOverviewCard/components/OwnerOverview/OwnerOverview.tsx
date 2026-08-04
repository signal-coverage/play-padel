"use client";

import { subDays } from "date-fns";
import { Bar, BarChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { MutedPanel } from "@/components/MutedPanel";
import { useOwnerReservationSummary } from "../../../../hooks";
import { OVERVIEW_CHART_CONFIG, OWNER_RANGE_DAYS } from "../../consts";
import { getBusiestWeekday } from "../../utils";

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
    <>
      {hasActivity && (
        <ChartContainer config={OVERVIEW_CHART_CONFIG} className="h-20 w-full">
          <BarChart data={chartData}>
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
      <MutedPanel className="text-xs text-muted-foreground">
        {busiest
          ? `${busiest}s are your busiest day this period.`
          : "No bookings yet this period."}
      </MutedPanel>
    </>
  );
}

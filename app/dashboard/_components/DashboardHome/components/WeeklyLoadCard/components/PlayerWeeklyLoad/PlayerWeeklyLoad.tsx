"use client";

import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { OverviewChart } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/components/OverviewChart";
import {
  buildWeekdayChartData,
  getBusiestWeekdayName,
  getPlayerLoadWindowStart,
  sumByWeekday,
} from "../../utils";

export function PlayerWeeklyLoad() {
  const { data: history = [] } = useMyReservations(true);
  const windowStart = getPlayerLoadWindowStart();
  const relevant = history.filter(
    (r) => r.status !== "CANCELLED" && r.scheduledStart >= windowStart,
  );

  const totals = sumByWeekday(
    relevant.map((r) => ({ date: r.scheduledStart, weight: 1 })),
  );
  const chartData = buildWeekdayChartData(totals);
  const hasActivity = totals.some((total) => total > 0);
  const busiest = getBusiestWeekdayName(totals);

  return (
    <OverviewChart
      chartData={chartData}
      hasActivity={hasActivity}
      caption={busiest ? `You play most often on ${busiest}s.` : null}
      emptyMessage="Book a few matches and we'll start showing your weekly rhythm here."
    />
  );
}

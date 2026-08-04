"use client";

import { Bar, BarChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { StatValue } from "@/components/StatValue";
import { MutedPanel } from "@/components/MutedPanel";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { useAuth } from "@/hooks/use-auth";
import { getWeekStarts, getWeeklyCounts } from "../../../../utils";
import { OVERVIEW_CHART_CONFIG, PLAYER_RANGE_WEEKS } from "../../consts";
import { getBusiestWeekday, getPadelCategoryLabel } from "../../utils";

export function PlayerOverview() {
  const { user } = useAuth();
  const { data: history = [] } = useMyReservations(true);
  const nonCancelled = history.filter((r) => r.status !== "CANCELLED");

  const weekStarts = getWeekStarts(PLAYER_RANGE_WEEKS);
  const counts = getWeeklyCounts(
    nonCancelled.map((r) => r.scheduledStart),
    PLAYER_RANGE_WEEKS,
  );
  const chartData = weekStarts.map((start, index) => ({
    date: start.toISOString(),
    total: counts[index],
  }));
  const hasActivity = chartData.some((week) => week.total > 0);

  const busiest =
    nonCancelled.length >= 3
      ? getBusiestWeekday(
          nonCancelled.map((r) => ({ date: r.scheduledStart, weight: 1 })),
        )
      : null;

  return (
    <>
      <div className="text-sm">
        <StatValue
          variant="row"
          label="Skill level"
          value={getPadelCategoryLabel(user?.padelCategory ?? null)}
          valueClassName="font-semibold"
        />
      </div>
      {hasActivity && (
        <ChartContainer config={OVERVIEW_CHART_CONFIG} className="h-20 w-full">
          <BarChart data={chartData}>
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
      <MutedPanel className="text-xs text-muted-foreground">
        {busiest
          ? `You play most often on ${busiest}s.`
          : "Book a few matches to start seeing your activity here."}
      </MutedPanel>
    </>
  );
}

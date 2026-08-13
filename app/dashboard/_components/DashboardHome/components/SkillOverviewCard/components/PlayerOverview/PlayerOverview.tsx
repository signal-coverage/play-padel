"use client";

import { StatValue } from "@/components/StatValue";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { useAuth } from "@/hooks/use-auth";
import { getWeekStarts, getWeeklyCounts } from "../../../../utils";
import { PLAYER_RANGE_WEEKS } from "../../consts";
import {
  getBusiestTimeOfDay,
  getBusiestWeekday,
  getPadelCategoryLabel,
} from "../../utils";
import { OverviewChart } from "../OverviewChart";

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

  const hasEnoughForPatterns = nonCancelled.length >= 3;
  const busiest = hasEnoughForPatterns
    ? getBusiestWeekday(
        nonCancelled.map((r) => ({ date: r.scheduledStart, weight: 1 })),
      )
    : null;
  const busiestTimeOfDay = hasEnoughForPatterns
    ? getBusiestTimeOfDay(nonCancelled.map((r) => r.scheduledStart))
    : null;

  const patternText =
    busiest && busiestTimeOfDay
      ? `You play most often on ${busiest}s, usually in the ${busiestTimeOfDay}.`
      : busiest
        ? `You play most often on ${busiest}s.`
        : null;

  return (
    <>
      <div className="text-sm">
        <StatValue
          variant="row"
          label="Skill level"
          value={getPadelCategoryLabel(user?.padelCategory ?? null)}
          valueClassName="font-semibold text-accent-foreground bg-accent rounded-full px-2 py-0.5"
        />
      </div>
      <OverviewChart
        chartData={chartData}
        hasActivity={hasActivity}
        caption={patternText}
        emptyMessage="Book a few matches and we'll start showing your play patterns here — busiest day, time of day, and more."
      />
    </>
  );
}

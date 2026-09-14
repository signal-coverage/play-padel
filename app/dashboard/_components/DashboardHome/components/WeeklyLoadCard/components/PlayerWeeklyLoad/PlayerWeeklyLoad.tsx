"use client";

import { useTranslations } from "next-intl";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { OverviewChart } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/components/OverviewChart";
import { WEEKDAY_KEYS } from "../../consts";
import {
  buildWeekdayChartData,
  getBusiestWeekdayIndex,
  getPlayerLoadWindowStart,
  sumByWeekday,
} from "../../utils";

export function PlayerWeeklyLoad() {
  const t = useTranslations("PlayerWeeklyLoad");
  const tWeekday = useTranslations("Weekday");
  const { data: history = [] } = useMyReservations(true);
  const windowStart = getPlayerLoadWindowStart();
  const relevant = history.filter(
    (r) => r.status !== "CANCELLED" && r.scheduledStart >= windowStart,
  );

  const totals = sumByWeekday(
    relevant.map((r) => ({ date: r.scheduledStart, weight: 1 })),
  );
  const shortLabels = WEEKDAY_KEYS.map((key) => tWeekday(`short.${key}`));
  const chartData = buildWeekdayChartData(totals, shortLabels);
  const hasActivity = totals.some((total) => total > 0);
  const busiestIndex = getBusiestWeekdayIndex(totals);
  const busiest =
    busiestIndex !== null
      ? tWeekday(`full.${WEEKDAY_KEYS[busiestIndex]}`)
      : null;

  return (
    <OverviewChart
      chartData={chartData}
      hasActivity={hasActivity}
      caption={busiest ? t("caption", { weekday: busiest }) : null}
      emptyMessage={t("emptyMessage")}
    />
  );
}

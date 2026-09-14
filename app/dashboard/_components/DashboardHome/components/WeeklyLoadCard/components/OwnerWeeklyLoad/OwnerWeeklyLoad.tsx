"use client";

import { subDays } from "date-fns";
import { useTranslations } from "next-intl";
import { OverviewChart } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/components/OverviewChart";
import { useOwnerReservationSummary } from "../../../../hooks";
import { OWNER_LOAD_RANGE_DAYS, WEEKDAY_KEYS } from "../../consts";
import {
  buildWeekdayChartData,
  getBusiestWeekdayIndex,
  sumByWeekday,
} from "../../utils";

export function OwnerWeeklyLoad() {
  const t = useTranslations("OwnerWeeklyLoad");
  const tWeekday = useTranslations("Weekday");
  const today = new Date();
  const from = subDays(today, OWNER_LOAD_RANGE_DAYS - 1);
  const { data: days = [] } = useOwnerReservationSummary(from, today);

  const totals = sumByWeekday(
    days.map((day) => ({ date: new Date(day.date), weight: day.total })),
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

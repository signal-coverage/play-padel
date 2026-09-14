"use client";

import { useTranslations } from "next-intl";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { getWeeklyCounts } from "../../../../utils";
import { PLAYER_SESSION_RANGE_WEEKS } from "../../consts";
import { buildTrend, getGaugeTone } from "../../utils";
import { SessionLoadGauge } from "../SessionLoadGauge";

// Higher shares of active weeks are healthier: >=70% is good, >=40% needs
// watching, below that needs attention.
const ACTIVE_WEEKS_TONE_THRESHOLDS = { good: 70, watch: 40 };
const HALF_RANGE_WEEKS = PLAYER_SESSION_RANGE_WEEKS / 2;

export function PlayerSessionLoad() {
  const t = useTranslations("PlayerSessionLoad");
  const { data: history = [] } = useMyReservations(true);
  const nonCancelled = history.filter((r) => r.status !== "CANCELLED");

  const counts = getWeeklyCounts(
    nonCancelled.map((r) => r.scheduledStart),
    PLAYER_SESSION_RANGE_WEEKS,
  );
  const activeWeeks = counts.filter((count) => count > 0).length;
  const percent = Math.round((activeWeeks / PLAYER_SESSION_RANGE_WEEKS) * 100);

  const firstHalfActive = counts
    .slice(0, HALF_RANGE_WEEKS)
    .filter((count) => count > 0).length;
  const secondHalfActive = counts
    .slice(HALF_RANGE_WEEKS)
    .filter((count) => count > 0).length;
  const firstHalfPercent = (firstHalfActive / HALF_RANGE_WEEKS) * 100;
  const secondHalfPercent = (secondHalfActive / HALF_RANGE_WEEKS) * 100;

  const tone = getGaugeTone(percent, ACTIVE_WEEKS_TONE_THRESHOLDS, false);
  const trend = buildTrend(secondHalfPercent, firstHalfPercent);

  return (
    <SessionLoadGauge
      percent={percent}
      tone={tone}
      caption={t("caption", {
        activeWeeks,
        totalWeeks: PLAYER_SESSION_RANGE_WEEKS,
      })}
      trend={trend}
      hasData={nonCancelled.length > 0}
      emptyMessage={t("emptyMessage")}
    />
  );
}

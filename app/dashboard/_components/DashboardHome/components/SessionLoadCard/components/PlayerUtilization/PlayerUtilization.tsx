"use client";

import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { getWeeklyCounts } from "../../../../utils";
import { PLAYER_CONSISTENCY_WEEKS } from "../../consts";
import { getConsistency } from "../../utils";
import { Gauge } from "../Gauge";

export function PlayerUtilization() {
  const { data: history = [] } = useMyReservations(true);
  const nonCancelled = history.filter((r) => r.status !== "CANCELLED");
  const counts = getWeeklyCounts(
    nonCancelled.map((r) => r.scheduledStart),
    PLAYER_CONSISTENCY_WEEKS,
  );
  const activeWeeks = counts.filter((count) => count > 0).length;
  const result = getConsistency(activeWeeks, PLAYER_CONSISTENCY_WEEKS);

  return (
    <Gauge
      percentage={result.percentage}
      display={`${result.activeWeeks}/${result.totalWeeks}`}
      band={result.band}
    />
  );
}

"use client";

import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { StatValue } from "@/components/StatValue";
import { dayKey } from "../../utils";

export function PlayerTodayCaption() {
  const { data: upcoming = [] } = useMyReservations(false);
  const todayKey = dayKey(new Date());
  const count = upcoming.filter(
    (r) => dayKey(r.scheduledStart) === todayKey,
  ).length;
  return (
    <StatValue
      variant="inline"
      value={String(count)}
      label={`reservation${count === 1 ? "" : "s"} today`}
    />
  );
}

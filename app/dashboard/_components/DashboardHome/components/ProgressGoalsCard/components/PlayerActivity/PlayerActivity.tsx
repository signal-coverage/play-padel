"use client";

import { startOfDay, subDays } from "date-fns";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { ACTIVITY_WINDOW_DAYS } from "../../consts";
import { getActivityWindowDays, hasActivityOnDay } from "../../utils";
import { ActivityBody } from "../ActivityBody";

export function PlayerActivity() {
  const { data: history = [] } = useMyReservations(true);
  const windowStart = startOfDay(subDays(new Date(), ACTIVITY_WINDOW_DAYS - 1));
  const inWindow = history.filter(
    (r) => r.status !== "CANCELLED" && r.scheduledStart >= windowStart,
  );

  const days = getActivityWindowDays();
  const dots = days.map((day) => ({
    date: day.toISOString(),
    active: hasActivityOnDay(
      inWindow.map((r) => r.scheduledStart),
      day,
    ),
  }));
  const activeDays = dots.filter((d) => d.active).length;

  return (
    <ActivityBody
      dots={dots}
      stats={[
        {
          label: "Active days",
          value: `${activeDays}/${ACTIVITY_WINDOW_DAYS}`,
        },
        { label: "Total sessions", value: String(inWindow.length) },
      ]}
    />
  );
}

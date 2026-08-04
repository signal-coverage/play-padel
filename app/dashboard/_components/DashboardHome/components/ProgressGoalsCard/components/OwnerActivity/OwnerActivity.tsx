"use client";

import { subDays } from "date-fns";
import { useOwnerReservationSummary } from "../../../../hooks";
import { ACTIVITY_WINDOW_DAYS } from "../../consts";
import { ActivityBody } from "../ActivityBody";

export function OwnerActivity() {
  const today = new Date();
  const from = subDays(today, ACTIVITY_WINDOW_DAYS - 1);
  const { data: days = [] } = useOwnerReservationSummary(from, today);

  const activeDays = days.filter((day) => day.total > 0).length;
  const totalBookings = days.reduce((sum, day) => sum + day.total, 0);

  return (
    <ActivityBody
      dots={days.map((day) => ({ date: day.date, active: day.total > 0 }))}
      stats={[
        {
          label: "Active days",
          value: `${activeDays}/${ACTIVITY_WINDOW_DAYS}`,
        },
        { label: "Total bookings", value: String(totalBookings) },
      ]}
    />
  );
}

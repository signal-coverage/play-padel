"use client";

import { useDayReservations } from "@/app/dashboard/reservations/_components/ReservationsView/hooks";
import { StatValue } from "@/components/StatValue";

export function OwnerTodayCaption() {
  const { data: reservations = [] } = useDayReservations(new Date());
  const count = reservations.filter((r) => r.status !== "CANCELLED").length;
  return (
    <StatValue
      variant="inline"
      value={String(count)}
      label={`reservation${count === 1 ? "" : "s"} today`}
    />
  );
}

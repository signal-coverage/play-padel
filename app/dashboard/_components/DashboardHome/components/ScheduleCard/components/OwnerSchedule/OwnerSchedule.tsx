"use client";

import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { useOwnerReservationSummary } from "../../../../hooks";
import { UPCOMING_LIST_LIMIT, UPCOMING_WINDOW_DAYS } from "../../consts";
import type { UpcomingItem } from "../../types";
import { buildMarkersFromSummary } from "../../utils";
import { useUpcomingReservations } from "../../hooks";
import { MarkedCalendar } from "../MarkedCalendar";
import { UpcomingList } from "../UpcomingList";

export function OwnerSchedule() {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const { data: days = [] } = useOwnerReservationSummary(monthStart, monthEnd);
  const markers = buildMarkersFromSummary(days);

  const windowEnd = addDays(today, UPCOMING_WINDOW_DAYS - 1);
  const { data: reservations = [] } = useUpcomingReservations(today, windowEnd);
  const upcoming: UpcomingItem[] = reservations
    .filter((r) => r.status !== "CANCELLED")
    .slice(0, UPCOMING_LIST_LIMIT)
    .map((r) => ({
      id: r.id,
      courtName: r.courtName,
      scheduledStart: r.scheduledStart,
    }));

  return (
    <>
      <MarkedCalendar markers={markers} />
      <UpcomingList items={upcoming} />
    </>
  );
}

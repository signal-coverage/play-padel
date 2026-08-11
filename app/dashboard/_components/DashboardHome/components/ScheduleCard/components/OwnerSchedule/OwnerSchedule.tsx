"use client";

import { useState } from "react";
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
  const [month, setMonth] = useState(() => today);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
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
      scheduledEnd: r.scheduledEnd,
      notes: r.notes,
      // The inline self-cancel action is a player-only affordance (this app's
      // owner-cancel flow has different semantics — see ReservationsView's
      // Complete/No-show/Cancel actions — not a quick inline "X" here).
      canSelfCancel: false,
      userName: r.userName,
    }));

  return (
    <>
      <MarkedCalendar markers={markers} month={month} onMonthChange={setMonth} />
      <UpcomingList items={upcoming} />
    </>
  );
}

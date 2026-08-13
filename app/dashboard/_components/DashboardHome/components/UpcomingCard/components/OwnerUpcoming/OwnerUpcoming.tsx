"use client";

import { addDays } from "date-fns";
import { UPCOMING_LIST_LIMIT, UPCOMING_WINDOW_DAYS } from "../../consts";
import type { UpcomingItem } from "../../types";
import { useUpcomingReservations } from "../../hooks";
import { UpcomingList } from "../UpcomingList";

export function OwnerUpcoming() {
  const today = new Date();
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

  return <UpcomingList items={upcoming} />;
}

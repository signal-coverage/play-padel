"use client";

import { useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { UPCOMING_LIST_LIMIT } from "../../consts";
import type { UpcomingItem } from "../../types";
import { buildMarkersFromReservations } from "../../utils";
import { MarkedCalendar } from "../MarkedCalendar";
import { UpcomingList } from "../UpcomingList";

export function PlayerSchedule() {
  const { data: history = [] } = useMyReservations(true);
  // useMyReservations(true) already returns the player's full history with
  // no date bound (see core/reservations/services: includePast applies no
  // range filter), so navigating to any past/future month here needs no
  // extra fetch — just a different slice of what's already loaded.
  const [month, setMonth] = useState(() => new Date());
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const thisMonth = history.filter(
    (r) => r.scheduledStart >= monthStart && r.scheduledStart <= monthEnd,
  );
  const markers = buildMarkersFromReservations(thisMonth);

  const { data: upcoming = [] } = useMyReservations(false);
  const items: UpcomingItem[] = upcoming
    .slice(0, UPCOMING_LIST_LIMIT)
    .map((r) => ({
      id: r.id,
      courtName: r.courtName,
      scheduledStart: r.scheduledStart,
      scheduledEnd: r.scheduledEnd,
      notes: r.notes,
      canSelfCancel: r.canSelfCancel,
    }));

  return (
    <>
      <MarkedCalendar markers={markers} month={month} onMonthChange={setMonth} />
      <UpcomingList items={items} />
    </>
  );
}

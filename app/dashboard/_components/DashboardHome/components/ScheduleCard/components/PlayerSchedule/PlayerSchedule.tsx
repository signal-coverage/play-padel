"use client";

import { endOfMonth, startOfMonth } from "date-fns";
import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { UPCOMING_LIST_LIMIT } from "../../consts";
import type { UpcomingItem } from "../../types";
import { buildMarkersFromReservations } from "../../utils";
import { MarkedCalendar } from "../MarkedCalendar";
import { UpcomingList } from "../UpcomingList";

export function PlayerSchedule() {
  const { data: history = [] } = useMyReservations(true);
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
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
    }));

  return (
    <>
      <MarkedCalendar markers={markers} />
      <UpcomingList items={items} />
    </>
  );
}

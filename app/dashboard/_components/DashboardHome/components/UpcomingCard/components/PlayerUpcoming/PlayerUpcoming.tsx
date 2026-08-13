"use client";

import { useMyReservations } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { UPCOMING_LIST_LIMIT } from "../../consts";
import type { UpcomingItem } from "../../types";
import { UpcomingList } from "../UpcomingList";

export function PlayerUpcoming() {
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

  return <UpcomingList items={items} />;
}

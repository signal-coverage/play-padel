"use client";

import { useQuery } from "@tanstack/react-query";
import { toReservationRecord } from "@/app/dashboard/reservations/_components/ReservationsView/utils";
import type {
  RawReservation,
  ReservationRecord,
} from "@/app/dashboard/reservations/_components/ReservationsView/types";
import { toDateParam } from "../../utils";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

/** Owner-only: individual reservations across a date range, for the
 * "upcoming games" list — distinct from useOwnerReservationSummary, which
 * only returns per-day aggregate counts. */
export function useUpcomingReservations(from: Date, to: Date) {
  const fromKey = toDateParam(from);
  const toKey = toDateParam(to);

  return useQuery({
    queryKey: ["owner-upcoming-reservations", fromKey, toKey],
    queryFn: () =>
      fetchJson<{ reservations: RawReservation[] }>(
        `/api/clubs/reservations?from=${fromKey}&to=${toKey}`,
      ).then((data): ReservationRecord[] =>
        data.reservations.map(toReservationRecord),
      ),
  });
}

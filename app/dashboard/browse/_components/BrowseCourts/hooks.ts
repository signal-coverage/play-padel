"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Club } from "@/core/clubs/types";
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";
import {
  playerClubsQueryKey,
  playerClubAvailabilityBaseKey,
  playerClubAvailabilityQueryKey,
} from "./consts";
import { toCourtColumns, toDateKey } from "./utils";
import type { BookSlotInput, RawCourt } from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export function useActiveClubs() {
  return useQuery({
    queryKey: playerClubsQueryKey,
    queryFn: () =>
      fetchJson<{ clubs: Club[] }>("/api/player/clubs").then((d) => d.clubs),
  });
}

// Live-ish booking grid: poll so slots booked/cancelled by other players
// show up without a manual refresh (see docs/reservation-flow.md). Kept in
// sync with the owner-side interval in the reservations feature.
const LIVE_REFETCH_INTERVAL_MS = 15_000;

export function useClubAvailability(
  clubId: string | null,
  date: Date,
): { data: CourtColumn[] | undefined; isLoading: boolean } {
  const dateKey = toDateKey(date);
  const { data, isLoading } = useQuery({
    queryKey: clubId
      ? playerClubAvailabilityQueryKey(clubId, dateKey)
      : [...playerClubAvailabilityBaseKey, "none"],
    queryFn: () =>
      fetchJson<{ courts: RawCourt[] }>(
        `/api/player/clubs/${clubId}/availability?date=${dateKey}`,
      ).then((d) => toCourtColumns(d.courts)),
    enabled: !!clubId,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
  return { data, isLoading: clubId ? isLoading : false };
}

export function useBookSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BookSlotInput) =>
      fetchJson("/api/player/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: playerClubAvailabilityBaseKey,
      });
    },
  });
}

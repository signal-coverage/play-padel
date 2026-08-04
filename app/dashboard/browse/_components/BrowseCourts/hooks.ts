"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Club } from "@/core/clubs/types";
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";
import {
  playerClubsQueryKey,
  playerClubAvailabilityBaseKey,
  playerClubAvailabilityQueryKey,
} from "./consts";
import { countUniqueSlotStarts, toCourtColumns, toDateKey } from "./utils";
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
): {
  data: CourtColumn[] | undefined;
  isLoading: boolean;
  // True while `data` is the *previous* date's placeholder data standing in
  // for the new query key (see `placeholderData` below) — i.e. the grid is
  // showing stale slots for the wrong date while the real fetch is still in
  // flight. Deliberately NOT driven by `isFetching`: that flag is also true
  // during the routine 15s live-refresh poll for the *current* date, where
  // `data` is already correct and slots must stay clickable.
  isUpdating: boolean;
  /** True when the availability fetch itself failed (as opposed to there simply being no courts). */
  isError: boolean;
  columnCount: number | undefined;
  rowCount: number | undefined;
} {
  const dateKey = toDateKey(date);
  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: clubId
      ? playerClubAvailabilityQueryKey(clubId, dateKey)
      : [...playerClubAvailabilityBaseKey, "none"],
    queryFn: () =>
      fetchJson<{ courts: RawCourt[] }>(
        `/api/player/clubs/${clubId}/availability?date=${dateKey}`,
      ).then((d) => toCourtColumns(d.courts)),
    enabled: !!clubId,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
    // Keep showing the previous day's grid (scoped to the same club) while
    // a new day's data loads, instead of tearing down to the loading
    // skeleton on every date-nav click. This also fixes the skeleton's
    // column/row-count guess: `data` (and the shape derived from it below)
    // stays populated across the fetch, so the skeleton fallback only ever
    // fires on a genuine first load or a club switch, when there really is
    // no prior shape to reuse.
    //
    // Caveat this introduces: TanStack Query sets `status: "success"` (not
    // "pending") while placeholder data is shown, so `isLoading` stays
    // false during this window even though `data` belongs to the wrong
    // date. Callers MUST also check `isUpdating` below before treating a
    // slot click as valid — see CourtAvailabilityGrid's `isUpdating` prop.
    placeholderData: (previousData, previousQuery) => {
      if (!clubId) return undefined;
      const previousClubId = previousQuery?.queryKey[2];
      return previousClubId === clubId ? previousData : undefined;
    },
  });

  return {
    data,
    isLoading: clubId ? isLoading : false,
    isUpdating: clubId ? isPlaceholderData : false,
    isError: clubId ? isError : false,
    columnCount: data?.length,
    rowCount: data ? countUniqueSlotStarts(data) : undefined,
  };
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

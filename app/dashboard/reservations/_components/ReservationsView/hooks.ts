"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { Slot } from "@/components/CourtAvailabilityGrid";
import { dateKey, toReservationRecord, toSlot } from "./utils";
import type {
  CourtSummary,
  RawReservation,
  RawSlot,
  ReservationActionInput,
  ReservationRecord,
} from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

export function useActiveCourts() {
  return useQuery({
    queryKey: ["courts", "active"],
    queryFn: () =>
      fetchJson<{ courts: CourtSummary[] }>("/api/clubs/courts").then(
        (data) => data.courts,
      ),
  });
}

// Live-ish booking grid: poll so new/cancelled reservations from other
// sessions show up without a manual refresh (see docs/reservation-flow.md).
const LIVE_REFETCH_INTERVAL_MS = 15_000;

export function useCourtSlotsQueries(courtIds: string[], date: Date) {
  const key = dateKey(date);
  return useQueries({
    queries: courtIds.map((courtId) => ({
      queryKey: ["court-slots", courtId, key],
      queryFn: (): Promise<Slot[]> =>
        fetchJson<{ slots: RawSlot[] }>(
          `/api/clubs/courts/${courtId}/slots?date=${key}`,
        ).then((data) => data.slots.map(toSlot)),
      refetchInterval: LIVE_REFETCH_INTERVAL_MS,
    })),
  });
}

// Opens GET /api/clubs/reservations/stream (Server-Sent Events), scoped to
// this one date, and refetches both the "reservations" and "court-slots"
// query families the instant the server notices this date's schedule
// actually changed — instead of waiting out LIVE_REFETCH_INTERVAL_MS. Same
// two-query invalidation shape as useReservationAction's own onSuccess
// above (both are two views of the same underlying data), and same "SSE is
// additive, the poll stays as a fallback baseline" precedent as
// NotificationsBell/hooks.ts's useNotificationStream.
function useReservationsStream(key: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(
      `/api/clubs/reservations/stream?date=${key}`,
    );

    function handleChanged() {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["court-slots"] });
    }

    source.addEventListener("changed", handleChanged);

    return () => {
      source.removeEventListener("changed", handleChanged);
      source.close();
    };
  }, [key, queryClient]);
}

export function useDayReservations(date: Date) {
  const key = dateKey(date);
  useReservationsStream(key);

  return useQuery({
    queryKey: ["reservations", key],
    queryFn: (): Promise<ReservationRecord[]> =>
      fetchJson<{ reservations: RawReservation[] }>(
        `/api/clubs/reservations?date=${key}`,
      ).then((data) => data.reservations.map(toReservationRecord)),
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
}

export function useReservationAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, action }: ReservationActionInput) =>
      fetchJson(`/api/clubs/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["court-slots"] });
      toast.success("Reservation updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

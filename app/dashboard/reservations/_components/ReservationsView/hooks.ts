"use client";

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

export function useDayReservations(date: Date) {
  const key = dateKey(date);
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

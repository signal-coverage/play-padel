"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myReservationsBaseKey, myReservationsQueryKey } from "./consts";
import { toPlayerReservation } from "./utils";
import type { RawPlayerReservation } from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export function useMyReservations(includePast: boolean) {
  return useQuery({
    queryKey: myReservationsQueryKey(includePast),
    queryFn: () =>
      fetchJson<{ reservations: RawPlayerReservation[] }>(
        `/api/player/reservations?includePast=${includePast}`,
      ).then((d) => d.reservations.map(toPlayerReservation)),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/player/reservations/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myReservationsBaseKey });
    },
  });
}

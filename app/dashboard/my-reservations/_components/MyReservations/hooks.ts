"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { myReservationsBaseKey, myReservationsQueryKey } from "./consts";
import { hasPendingPaymentHold, toPlayerReservation } from "./utils";
import type { RawPlayerReservation } from "./types";

async function fetchJson<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackErrorMessage: string,
): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? fallbackErrorMessage);
  }
  return body as T;
}

// While a reservation on this list is a SCHEDULED hold still waiting on its
// payment outcome (Mercado Pago's webhook, or a bank transfer the club hasn't
// confirmed yet), poll so that outcome — paid (CONFIRMED) or lapsed
// (CANCELLED, via the server's own lazy-expiry) — shows up here without a
// manual refresh, same intent as PaymentReturnView/hooks.ts's own
// usePaymentReturnStatus polling. Stops automatically (see
// hasPendingPaymentHold) once nothing on the list is still pending.
const PENDING_HOLD_REFETCH_INTERVAL_MS = 5_000;

export function useMyReservations(includePast: boolean) {
  const t = useTranslations("MyReservationsData");
  return useQuery({
    queryKey: myReservationsQueryKey(includePast),
    queryFn: () =>
      fetchJson<{ reservations: RawPlayerReservation[] }>(
        `/api/player/reservations?includePast=${includePast}`,
        undefined,
        t("genericError"),
      ).then((d) => d.reservations.map(toPlayerReservation)),
    refetchInterval: (query) =>
      hasPendingPaymentHold(query.state.data)
        ? PENDING_HOLD_REFETCH_INTERVAL_MS
        : false,
  });
}

export function useCancelReservation() {
  const t = useTranslations("MyReservationsData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(
        `/api/player/reservations/${id}/cancel`,
        { method: "POST" },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myReservationsBaseKey });
    },
  });
}

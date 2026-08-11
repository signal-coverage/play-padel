"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PaymentReturnState, ReturnReservation } from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const POLL_INTERVAL_MS = 3_000;

// Polls the player's own reservation list (no new endpoint needed) until the
// webhook (the actual source of truth) has settled this reservation one way
// or the other, or its 15-minute hold has visibly lapsed.
export function usePaymentReturnStatus(reservationId: string | null) {
  const now = useNow(POLL_INTERVAL_MS);
  const query = useQuery({
    queryKey: ["payment-return", reservationId],
    queryFn: () =>
      fetchJson<{ reservations: ReturnReservation[] }>(
        "/api/player/reservations?includePast=true",
      ).then((d) => d.reservations.find((r) => r.id === reservationId) ?? null),
    enabled: !!reservationId,
    refetchInterval: (query) => {
      const reservation = query.state.data;
      if (!reservation) return POLL_INTERVAL_MS;
      const stillPending =
        reservation.status === "SCHEDULED" &&
        (!reservation.paymentExpiresAt ||
          new Date(reservation.paymentExpiresAt).getTime() > Date.now());
      return stillPending ? POLL_INTERVAL_MS : false;
    },
  });

  const reservation = query.data ?? null;

  let state: PaymentReturnState = "processing";
  if (reservation?.status === "CONFIRMED") {
    state = "success";
  } else if (
    reservation &&
    reservation.status === "SCHEDULED" &&
    reservation.paymentExpiresAt &&
    new Date(reservation.paymentExpiresAt).getTime() <= now
  ) {
    state = "failed";
  } else if (reservation && reservation.status !== "SCHEDULED") {
    // Any settled non-SCHEDULED status (CANCELLED, COMPLETED, NO_SHOW) means
    // this reservation will never become CONFIRMED via the webhook — show it
    // as failed rather than spinning forever.
    state = "failed";
  } else if (!query.isLoading && !reservation) {
    state = "failed";
  }

  return { state, reservation, isLoading: query.isLoading };
}

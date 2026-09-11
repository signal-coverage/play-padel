"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

// Opens GET /api/player/reservations/stream (Server-Sent Events), scoped to
// this one reservation, and invalidates the query below the instant the
// server notices its status/paymentExpiresAt actually changed — instead of
// waiting out the 3s poll below. That poll stays in place regardless (see
// usePaymentReturnStatus's own refetchInterval) as a fallback baseline, same
// "SSE is additive, never a replacement" precedent as
// NotificationsBell/hooks.ts's useNotificationStream. Native EventSource
// reconnects automatically on any connection close, so no manual reconnect
// logic is needed here.
function usePaymentReturnStream(reservationId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!reservationId) return;

    const source = new EventSource(
      `/api/player/reservations/stream?reservationId=${reservationId}`,
    );

    function handleChanged() {
      queryClient.invalidateQueries({
        queryKey: ["payment-return", reservationId],
      });
    }

    source.addEventListener("changed", handleChanged);

    return () => {
      source.removeEventListener("changed", handleChanged);
      source.close();
    };
  }, [reservationId, queryClient]);
}

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

  usePaymentReturnStream(reservationId);

  const reservation = query.data ?? null;

  let state: PaymentReturnState = "processing";
  // Checked FIRST, ahead of every other branch below: this app's own fetch
  // failing (network error, our API 500ing) is not the same thing as "the
  // payment didn't go through" — without this, `!query.isLoading &&
  // !reservation` (the last branch here) would silently misclassify a
  // genuine backend failure as a settled, failed payment, telling the
  // player their booking/hold expired when we actually just don't know.
  if (query.isError) {
    state = "error";
  } else if (reservation?.status === "CONFIRMED") {
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

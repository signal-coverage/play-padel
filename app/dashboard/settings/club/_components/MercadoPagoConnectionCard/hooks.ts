"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MERCADOPAGO_DISCONNECT_URL,
  MERCADOPAGO_STATUS_QUERY_KEY,
} from "./consts";
import type { MercadoPagoOperationalStatus } from "./types";

async function fetchOperationalStatus(): Promise<MercadoPagoOperationalStatus> {
  const res = await fetch("/api/clubs/mercadopago/operational-status");
  if (!res.ok) {
    throw new Error("Failed to load Mercado Pago connection status");
  }
  return res.json();
}

export function useMercadoPagoOperationalStatus() {
  return useQuery({
    queryKey: MERCADOPAGO_STATUS_QUERY_KEY,
    queryFn: fetchOperationalStatus,
  });
}

async function disconnectMercadoPago(): Promise<void> {
  const res = await fetch(MERCADOPAGO_DISCONNECT_URL, { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to unlink Mercado Pago");
  }
}

// Invalidates MERCADOPAGO_STATUS_QUERY_KEY, which is intentionally the same
// array as ClubOperationalGate's CLUB_OPERATIONAL_STATUS_QUERY_KEY (see that
// component's consts.ts) — TanStack Query matches query keys by deep value
// equality, not by reference, so this one invalidation refreshes both the
// card here and the dashboard's operational-gate overlay without either
// component needing to know about the other's cache key.
export function useDisconnectMercadoPago() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectMercadoPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MERCADOPAGO_STATUS_QUERY_KEY });
    },
  });
}

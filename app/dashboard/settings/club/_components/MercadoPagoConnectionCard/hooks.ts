"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  MERCADOPAGO_DISCONNECT_URL,
  MERCADOPAGO_STATUS_QUERY_KEY,
} from "./consts";
import type { MercadoPagoOperationalStatus } from "./types";

async function fetchOperationalStatus(
  fallbackErrorMessage: string,
): Promise<MercadoPagoOperationalStatus> {
  const res = await fetch("/api/clubs/mercadopago/operational-status");
  if (!res.ok) {
    throw new Error(fallbackErrorMessage);
  }
  return res.json();
}

export function useMercadoPagoOperationalStatus() {
  const t = useTranslations("MercadoPagoConnectionCardData");
  return useQuery({
    queryKey: MERCADOPAGO_STATUS_QUERY_KEY,
    queryFn: () => fetchOperationalStatus(t("failedToLoadStatus")),
  });
}

async function disconnectMercadoPago(
  fallbackErrorMessage: string,
): Promise<void> {
  const res = await fetch(MERCADOPAGO_DISCONNECT_URL, { method: "POST" });
  if (!res.ok) {
    throw new Error(fallbackErrorMessage);
  }
}

// Invalidates MERCADOPAGO_STATUS_QUERY_KEY, which is intentionally the same
// array as ClubOperationalGate's CLUB_OPERATIONAL_STATUS_QUERY_KEY (see that
// component's consts.ts) — TanStack Query matches query keys by deep value
// equality, not by reference, so this one invalidation refreshes both the
// card here and the dashboard's operational-gate overlay without either
// component needing to know about the other's cache key.
export function useDisconnectMercadoPago() {
  const t = useTranslations("MercadoPagoConnectionCardData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectMercadoPago(t("failedToUnlink")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MERCADOPAGO_STATUS_QUERY_KEY });
    },
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { MERCADOPAGO_STATUS_QUERY_KEY } from "./consts";
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

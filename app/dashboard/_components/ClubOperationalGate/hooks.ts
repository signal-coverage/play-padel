"use client";

import { useQuery } from "@tanstack/react-query";
import { CLUB_OPERATIONAL_STATUS_QUERY_KEY } from "./consts";
import type { ClubOperationalStatusResponse } from "./types";

async function fetchClubOperationalStatus(): Promise<ClubOperationalStatusResponse> {
  const res = await fetch("/api/clubs/mercadopago/operational-status");
  if (!res.ok) {
    throw new Error("Failed to load club operational status");
  }
  return res.json();
}

export function useClubOperationalStatus() {
  return useQuery({
    queryKey: CLUB_OPERATIONAL_STATUS_QUERY_KEY,
    queryFn: fetchClubOperationalStatus,
  });
}

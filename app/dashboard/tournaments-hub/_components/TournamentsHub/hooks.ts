"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpenTournamentSummary } from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

/**
 * Global (cross-club) discovery list — see listOpenTournamentsForPlayer's
 * own "no home club" reasoning. Surfaces a tournament that's currently open
 * for registration, or one the player already has an active team in.
 */
export function useOpenTournaments() {
  return useQuery({
    queryKey: ["tournaments", "open"],
    queryFn: () =>
      fetchJson<{ tournaments: OpenTournamentSummary[] }>(
        "/api/tournaments/open",
      ).then((data) => data.tournaments),
  });
}

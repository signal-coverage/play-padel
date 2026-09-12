"use client";

import { useQuery } from "@tanstack/react-query";
import type { PlayerCandidate } from "./types";

async function fetchPlayerCandidates(): Promise<PlayerCandidate[]> {
  const res = await fetch("/api/players");
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Could not load players.");
  }
  return body.players;
}

/**
 * Shared player-candidate data hook behind PlayerPicker (both the
 * multi-select PartnerPicker wrapper and single-select tournament
 * registration). Reuses the players directory's own `/api/players`
 * endpoint (see app/dashboard/players/_components/PlayersDirectory/hooks.ts's
 * usePlayers) — full list fetched once, filtered client-side (utils.ts's
 * filterPlayerCandidates).
 */
export function usePlayerCandidates() {
  return useQuery({
    queryKey: ["player-picker", "players"],
    queryFn: fetchPlayerCandidates,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PlayerTournamentDetail } from "./types";

async function fetchJson<T>(
  url: string,
  fallbackErrorMessage: string,
): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallbackErrorMessage);
  }
  return res.json();
}

/**
 * Player-facing tournament detail — no club scoping (see the plan's "no
 * home club" reasoning), gated only by being signed in, same as every
 * other player tournament route.
 */
export function useTournamentDetail(tournamentId: string | null) {
  const t = useTranslations("TournamentModalData");
  return useQuery({
    queryKey: ["tournaments", "player-detail", tournamentId],
    queryFn: () =>
      fetchJson<{ tournament: PlayerTournamentDetail }>(
        `/api/tournaments/${tournamentId}`,
        t("genericError"),
      ).then((data) => data.tournament),
    enabled: Boolean(tournamentId),
  });
}

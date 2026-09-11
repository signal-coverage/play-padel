"use client";

import { useQuery } from "@tanstack/react-query";
import type { CategoryStandingsDetailResponse } from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

/**
 * Player-facing read-only detail for one category — powers GroupsStandingsView.
 * No club scoping (see the plan's "no home club" reasoning) — gated only by
 * being signed in, same as every other player tournament route.
 */
export function useCategoryStandingsDetail(
  tournamentId: string | null,
  categoryId: string | null,
) {
  return useQuery({
    queryKey: ["tournaments", "standings-detail", tournamentId, categoryId],
    queryFn: () =>
      fetchJson<CategoryStandingsDetailResponse>(
        `/api/tournaments/${tournamentId}/categories/${categoryId}/standings`,
      ),
    enabled: Boolean(tournamentId && categoryId),
  });
}

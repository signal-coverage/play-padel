"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CategoryTeam } from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body;
}

export function useCategoryTeams(
  tournamentId: string | null,
  categoryId: string | null,
) {
  return useQuery({
    queryKey: ["tournaments", "player-teams", categoryId],
    queryFn: () =>
      fetchJson<{ teams: CategoryTeam[] }>(
        `/api/tournaments/${tournamentId}/categories/${categoryId}/teams`,
      ).then((data) => data.teams),
    enabled: Boolean(tournamentId && categoryId),
  });
}

/**
 * Registers the signed-in player and a chosen partner as a doubles team
 * (see registerTeam's own validation order: self-tag, registration window,
 * both players real, neither already registered, padel category bounds,
 * maxTeams cap) — every server-reported error surfaces verbatim via toast,
 * never swallowed.
 */
export function useRegisterTeam(tournamentId: string, categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: string) =>
      fetchJson<{ team: CategoryTeam }>(
        `/api/tournaments/${tournamentId}/categories/${categoryId}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partnerId }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "player-teams", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "player-detail", tournamentId],
      });
      queryClient.invalidateQueries({ queryKey: ["tournaments", "open"] });
      toast.success("You're registered!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useWithdrawTeam(tournamentId: string, categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) =>
      fetchJson<{ team: CategoryTeam }>(
        `/api/tournaments/${tournamentId}/teams/${teamId}/withdraw`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "player-teams", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "player-detail", tournamentId],
      });
      queryClient.invalidateQueries({ queryKey: ["tournaments", "open"] });
      toast.success("Registration withdrawn");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

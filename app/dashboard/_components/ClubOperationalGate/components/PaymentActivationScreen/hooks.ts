"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Plan } from "@/core/clubs/types";
import { CLUB_PLAN_QUERY_KEY } from "./consts";
import type { ClubPlanResponse } from "./types";

// Duplicated on purpose (a few lines) rather than imported from
// ClubSettingsView/hooks.ts — per this repo's SRP-per-folder convention,
// each component folder is an independent module.
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

// Returns the full useQuery result (not just `data`/`isLoading`) so callers
// can also read `isError`/`refetch`: this dialog is a non-dismissible hard
// gate, so a failed fetch must offer a way to recover instead of leaving
// `data` undefined with no signal beyond a permanently-loading skeleton.
export function useClubPlan() {
  return useQuery({
    queryKey: CLUB_PLAN_QUERY_KEY,
    queryFn: () =>
      fetchJson<ClubPlanResponse>("/api/clubs").then((data) => data.club.plan),
  });
}

export function useUpdateClubPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) =>
      fetchJson<ClubPlanResponse>("/api/clubs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLUB_PLAN_QUERY_KEY });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

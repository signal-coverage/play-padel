"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateClosureInput } from "@/core/courts/types";
import type { RawClubClosure } from "./types";
import { toClubClosure } from "./utils";

const CLUB_CLOSURES_QUERY_KEY = ["club-closures", "settings"] as const;
const ACTIVE_COURT_IDS_QUERY_KEY = [
  "club-courts",
  "settings",
  "active-ids",
] as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

export function useClubClosures() {
  return useQuery({
    queryKey: CLUB_CLOSURES_QUERY_KEY,
    queryFn: () =>
      fetchJson<{ closures: RawClubClosure[] }>("/api/clubs/closures").then(
        (data) => data.closures.map(toClubClosure),
      ),
  });
}

// GET /api/clubs/courts with no query params already excludes inactive
// courts (see listCourtsByClub's `includeInactive` default) — the same
// default CourtsView opts out of via `?includeInactive=true` for its own
// full management table. Only the ids are needed here, to fan the closure
// creation mutation out over every one of them.
export function useActiveCourtIds() {
  return useQuery({
    queryKey: ACTIVE_COURT_IDS_QUERY_KEY,
    queryFn: () =>
      fetchJson<{ courts: { id: string }[] }>("/api/clubs/courts").then(
        (data) => data.courts.map((court) => court.id),
      ),
  });
}

// No onSuccess/onError toast here, mirroring CourtsView's
// useCreateCourtClosure — ClubClosuresCard fans this out over every active
// court via Promise.allSettled and aggregates the per-court outcomes into
// one summary toast itself (see core/courts/utils/closureFanOut.ts).
export function useCreateClubClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
      input,
    }: {
      courtId: string;
      input: CreateClosureInput;
    }) =>
      fetchJson<{ closure: RawClubClosure }>(
        `/api/clubs/courts/${courtId}/closures`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLUB_CLOSURES_QUERY_KEY });
    },
  });
}

// Cancelling from this club-wide view hits the exact same per-court cancel
// endpoint CourtsView's own ClosuresSheet already uses (each closure is
// still just a CourtClosure row scoped to one court — there's no separate
// "club closure" entity to cancel instead) — this hook only differs from
// useCancelCourtClosure in which query key it invalidates on success.
export function useCancelClubClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
      closureId,
    }: {
      courtId: string;
      closureId: string;
    }) =>
      fetchJson<{ closure: RawClubClosure }>(
        `/api/clubs/courts/${courtId}/closures/${closureId}/cancel`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLUB_CLOSURES_QUERY_KEY });
      toast.success("Closure cancelled");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

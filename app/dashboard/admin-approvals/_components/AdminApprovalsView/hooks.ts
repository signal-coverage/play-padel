"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PENDING_CLUBS_QUERY_KEY } from "./consts";
import type { PendingClub } from "./types";

// Duplicated (a few lines) rather than imported from a shared fetch helper —
// per this repo's SRP-per-folder convention, each component folder is an
// independent module (same idiom as PaymentActivationScreen/hooks.ts's own
// copy of this helper).
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

// GET /api/admin/clubs/pending — the admin approval queue (see
// prisma/schema.prisma's Club.approvalStatus).
export function usePendingClubs() {
  return useQuery({
    queryKey: PENDING_CLUBS_QUERY_KEY,
    queryFn: () =>
      fetchJson<{ clubs: PendingClub[] }>("/api/admin/clubs/pending").then(
        (data) => data.clubs,
      ),
  });
}

// Removes `clubId` from the cached pending-clubs list right away, then
// invalidates so a background refetch reconciles with the server. The direct
// patch is what actually makes the row disappear immediately — the POST
// already confirmed the change server-side, so there's nothing left to wait
// on. Relying on invalidateQueries alone (a second, unobserved network
// round-trip) is what let a slow or failed background refetch leave the row
// showing as pending until an unrelated full page reload happened to fetch
// a fresh copy.
function removeFromPendingClubsCache(queryClient: QueryClient, clubId: string) {
  queryClient.setQueryData<PendingClub[]>(PENDING_CLUBS_QUERY_KEY, (old) =>
    old?.filter((club) => club.id !== clubId),
  );
  queryClient.invalidateQueries({ queryKey: PENDING_CLUBS_QUERY_KEY });
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : "Something went wrong. Please try again.";
}

// POST /api/admin/clubs/[clubId]/approve.
export function useApproveClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clubId: string) =>
      fetchJson(`/api/admin/clubs/${clubId}/approve`, { method: "POST" }),
    onSuccess: (_data, clubId) => {
      removeFromPendingClubsCache(queryClient, clubId);
      toast.success("Club approved");
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });
}

// POST /api/admin/clubs/[clubId]/reject — same cache handling as
// useApproveClub above.
export function useRejectClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clubId: string) =>
      fetchJson(`/api/admin/clubs/${clubId}/reject`, { method: "POST" }),
    onSuccess: (_data, clubId) => {
      removeFromPendingClubsCache(queryClient, clubId);
      toast.success("Club rejected");
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });
}

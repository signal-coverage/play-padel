"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

// POST /api/admin/clubs/[clubId]/approve. Invalidates the pending queue on
// success so the approved club disappears from the list immediately.
export function useApproveClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clubId: string) =>
      fetchJson(`/api/admin/clubs/${clubId}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_CLUBS_QUERY_KEY });
    },
  });
}

// POST /api/admin/clubs/[clubId]/reject — same invalidation as
// useApproveClub above.
export function useRejectClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clubId: string) =>
      fetchJson(`/api/admin/clubs/${clubId}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_CLUBS_QUERY_KEY });
    },
  });
}

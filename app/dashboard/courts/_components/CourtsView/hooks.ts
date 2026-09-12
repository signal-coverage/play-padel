"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateCourtInput, UpdateCourtInput } from "@/core/courts/types";
import type {
  AvailabilityEntry,
  CourtAvailability,
  CreateClosureInput,
} from "@/core/courts/types";
import type { Plan } from "@/core/clubs/types";
import type { CourtRecord, RawCourtClosure } from "./types";
import { toCourtClosure } from "./utils";

const COURTS_QUERY_KEY = ["courts", "manage"] as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

export function useManagedCourts() {
  return useQuery({
    queryKey: COURTS_QUERY_KEY,
    queryFn: () =>
      fetchJson<{ courts: CourtRecord[] }>(
        "/api/clubs/courts?includeInactive=true",
      ).then((data) => data.courts),
  });
}

// Narrow read of the owner's own club (GET /api/clubs) — just enough to
// decide whether the plan-based court limit applies here at all. `plan` and
// `courtLimit` combine the same way core/courts/services/courts.service.ts's
// createCourt enforces server-side (see lib/consts/planPricing.ts's
// PLAN_COURT_LIMITS): a per-club courtLimit override wins when set,
// otherwise the plan's own default applies. `isFreePlan` bypasses the check
// entirely, regardless of `plan`. A failed/loading fetch resolves to
// `undefined` fields below, which CourtsView treats as "not at the limit" —
// the real enforcement lives server-side, so this frontend gate fails open
// rather than blocking a legitimate create over a transient network hiccup.
export function useClubPlanInfo() {
  return useQuery({
    queryKey: ["clubs", "current", "plan-info"] as const,
    queryFn: () =>
      fetchJson<{
        club: { plan: Plan; courtLimit?: number | null };
        isFreePlan: boolean;
      }>("/api/clubs").then(({ club, isFreePlan }) => ({
        plan: club.plan,
        courtLimit: club.courtLimit ?? null,
        isFreePlan,
      })),
  });
}

export function useCreateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourtInput) =>
      fetchJson<{ court: CourtRecord }>("/api/clubs/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    // Success signaling (toast + celebration) intentionally lives in
    // CourtsView's handleFormSubmit instead of here: this resolves the
    // instant the create POST lands, before the chained photo upload (when
    // there is one) even starts, which previously fired the toast/
    // celebration and closed-looking table update while the Sheet was still
    // showing "Saving…" for the photo. See CourtsView.tsx.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURTS_QUERY_KEY });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
      input,
    }: {
      courtId: string;
      input: UpdateCourtInput;
      // Set by BulkEditCourtsSheet, which fans this mutation out to every
      // selected court and shows its own aggregate summary toast — without
      // this, an N-court bulk apply would also stack N "Court updated"
      // toasts from this hook's own onSuccess.
      silent?: boolean;
    }) =>
      fetchJson<{ court: CourtRecord }>(`/api/clubs/courts/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: COURTS_QUERY_KEY });
      if (!variables.silent) toast.success("Court updated");
    },
    onError: (error: Error, variables) => {
      if (!variables.silent) toast.error(error.message);
    },
  });
}

export function useUploadCourtPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, file }: { courtId: string; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      return fetchJson<{ photoUrl: string }>(
        `/api/clubs/courts/${courtId}/photo`,
        { method: "POST", body: formData },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURTS_QUERY_KEY });
    },
  });
}

export function useDeleteCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
    }: {
      courtId: string;
      // Set by CourtsView's handleFormSubmit when it rolls back a
      // just-created court after its chained photo upload fails — that
      // rollback already surfaces its own error toast for the real failure
      // (the photo upload), so this internal cleanup delete must stay quiet
      // instead of also firing "Court deactivated" (misleading — nothing
      // was ever really "deactivated" from the owner's perspective) or a
      // second, redundant error toast if the rollback itself fails. Same
      // shape as useUpdateCourt's own `silent` flag above.
      silent?: boolean;
    }) =>
      fetchJson<{ ok: true }>(`/api/clubs/courts/${courtId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: COURTS_QUERY_KEY });
      if (!variables.silent) toast.success("Court deactivated");
    },
    onError: (error: Error, variables) => {
      if (!variables.silent) toast.error(error.message);
    },
  });
}

export function useCourtAvailability(courtId: string | null) {
  return useQuery({
    queryKey: ["court-availability", courtId],
    queryFn: () =>
      fetchJson<{ availability: CourtAvailability[] }>(
        `/api/clubs/courts/${courtId}/availability`,
      ).then((data) => data.availability),
    enabled: Boolean(courtId),
  });
}

export function useSetCourtAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
      entries,
    }: {
      courtId: string;
      entries: AvailabilityEntry[];
    }) =>
      fetchJson<{ availability: CourtAvailability[] }>(
        `/api/clubs/courts/${courtId}/availability`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entries),
        },
      ),
    // No onSuccess toast here: availability is now always saved together
    // with the court's details as one single action (see CourtFormSheet /
    // CourtsView.handleFormSubmit), and useUpdateCourt's own "Court updated"
    // toast already signals that combined save — a second "Weekly
    // availability saved" toast firing right alongside it would just read as
    // redundant/confusing for one user action.
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["court-availability", variables.courtId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useClubOperatingHours(enabled: boolean) {
  return useQuery({
    queryKey: ["club-operating-hours"],
    queryFn: () =>
      fetchJson<{ operatingHours: AvailabilityEntry[] }>(
        "/api/clubs/operating-hours",
      ).then((data) => data.operatingHours),
    enabled,
  });
}

export function useCourtClosures(courtId: string | null) {
  return useQuery({
    queryKey: ["court-closures", courtId],
    queryFn: () =>
      fetchJson<{ closures: RawCourtClosure[] }>(
        `/api/clubs/courts/${courtId}/closures`,
      ).then((data) => data.closures.map(toCourtClosure)),
    enabled: Boolean(courtId),
  });
}

// No onSuccess/onError toast here, unlike this file's other mutations —
// ClosuresSheet's "apply to all courts" option calls this once per court via
// Promise.allSettled and needs to aggregate the per-court outcomes into a
// single summary toast itself; a toast fired from here per court would be
// redundant (or misleading) alongside that aggregate message.
export function useCreateCourtClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
      input,
    }: {
      courtId: string;
      input: CreateClosureInput;
    }) =>
      fetchJson<{ closure: RawCourtClosure }>(
        `/api/clubs/courts/${courtId}/closures`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ).then((data) => ({ closure: toCourtClosure(data.closure) })),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["court-closures", variables.courtId],
      });
    },
  });
}

export function useCancelCourtClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
      closureId,
    }: {
      courtId: string;
      closureId: string;
    }) =>
      fetchJson<{ closure: RawCourtClosure }>(
        `/api/clubs/courts/${courtId}/closures/${closureId}/cancel`,
        { method: "POST" },
      ).then((data) => ({ closure: toCourtClosure(data.closure) })),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["court-closures", variables.courtId],
      });
      toast.success("Closure cancelled");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

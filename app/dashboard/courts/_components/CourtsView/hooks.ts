"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateCourtInput, UpdateCourtInput } from "@/core/courts/types";
import type { AvailabilityEntry, CourtAvailability } from "@/core/courts/types";
import type { CourtRecord } from "./types";

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

export function useCreateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourtInput) =>
      fetchJson<{ court: CourtRecord }>("/api/clubs/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURTS_QUERY_KEY });
      toast.success("Court created");
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
    }) =>
      fetchJson<{ court: CourtRecord }>(`/api/clubs/courts/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURTS_QUERY_KEY });
      toast.success("Court updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courtId: string) =>
      fetchJson<{ ok: true }>(`/api/clubs/courts/${courtId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURTS_QUERY_KEY });
      toast.success("Court deactivated");
    },
    onError: (error: Error) => toast.error(error.message),
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["court-availability", variables.courtId],
      });
      toast.success("Weekly availability saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

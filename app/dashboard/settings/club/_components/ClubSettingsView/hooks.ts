"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClubSettingsFormValues, ClubRecord } from "./types";

const CLUB_QUERY_KEY = ["clubs", "current"] as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

export function useCurrentClub() {
  return useQuery({
    queryKey: CLUB_QUERY_KEY,
    queryFn: () =>
      fetchJson<{ club: ClubRecord }>("/api/clubs").then((data) => data.club),
  });
}

export function useUpdateClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ClubSettingsFormValues>) =>
      fetchJson<{ club: ClubRecord }>("/api/clubs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLUB_QUERY_KEY });
      toast.success("Club settings updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

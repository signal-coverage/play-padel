"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminClubListItem, ClubOwner } from "./types";

export const ADMIN_CLUBS_QUERY_KEY = ["admin", "clubs"] as const;

async function fetchAdminClubs(): Promise<AdminClubListItem[]> {
  const res = await fetch("/api/admin/clubs");
  if (!res.ok) {
    throw new Error("Failed to load clubs");
  }
  const data = await res.json();
  return data.clubs;
}

export function useAdminClubs() {
  return useQuery({
    queryKey: ADMIN_CLUBS_QUERY_KEY,
    queryFn: fetchAdminClubs,
  });
}

// Separate lookup from the same GET /api/admin/clubs/[clubId] endpoint
// ClubSettingsView's own hooks.ts already fetches for the club's settings
// fields — this repo's existing SRP-per-folder convention keeps each
// folder's data needs self-contained rather than reaching into a sibling
// folder's hooks, so this is a second small round-trip to the same route
// rather than a shared cross-folder hook.
export function useClubOwner(clubId?: string) {
  return useQuery({
    queryKey: ["admin", "clubs", clubId, "owner"] as const,
    queryFn: async (): Promise<ClubOwner | null> => {
      const res = await fetch(`/api/admin/clubs/${clubId}`);
      if (!res.ok) {
        throw new Error("Failed to load club owner");
      }
      const data = await res.json();
      return data.owner ?? null;
    },
    enabled: Boolean(clubId),
  });
}

// Admin-only impersonation — see app/api/admin/impersonate/route.ts. Same
// behavior as PlayersDirectory's useImpersonatePlayer: opens the returned
// Clerk sign-in url in a new tab, keeping the admin's own session intact.
export function useImpersonateOwner() {
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          body?.error ?? "Something went wrong. Please try again.",
        );
      }
      return body as { url: string };
    },
    onSuccess: ({ url }) => {
      window.open(url, "_blank");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

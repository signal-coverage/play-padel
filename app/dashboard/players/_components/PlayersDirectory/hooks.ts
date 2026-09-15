"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { playersQueryKey } from "./consts";
import type { PlayerListItem, PlayerPatchInput } from "./types";

async function fetchPlayers(
  fallbackErrorMessage: string,
): Promise<PlayerListItem[]> {
  const res = await fetch("/api/players");
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? fallbackErrorMessage);
  }
  return body.players;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackErrorMessage: string,
): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? fallbackErrorMessage);
  }
  return body;
}

export function usePlayers() {
  const t = useTranslations("PlayersDirectoryData");
  return useQuery({
    queryKey: playersQueryKey,
    queryFn: () => fetchPlayers(t("loadError")),
  });
}

// Admin-only edit — see app/api/admin/players/[userId]/route.ts's PATCH
// handler. Uses invalidateQueries (not a manual cache merge) on success,
// matching this codebase's existing mutation-hook convention (see
// CourtsView/hooks.ts's useUpdateCourt).
export function useUpdatePlayer() {
  const t = useTranslations("PlayersDirectoryData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: PlayerPatchInput;
    }) =>
      fetchJson<{ player: PlayerListItem }>(
        `/api/admin/players/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playersQueryKey });
      toast.success(t("playerUpdated"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Admin-only delete — see app/api/admin/players/[userId]/route.ts's DELETE
// handler, which anonymizes the player row rather than hard-deleting it.
export function useDeletePlayer() {
  const t = useTranslations("PlayersDirectoryData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      fetchJson<{ ok: true }>(
        `/api/admin/players/${userId}`,
        { method: "DELETE" },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playersQueryKey });
      toast.success(t("playerRemoved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Admin-only impersonation — see app/api/admin/impersonate/route.ts. On
// success, opens the returned Clerk sign-in url in a new tab rather than
// navigating the admin's own current tab away, so their admin session stays
// intact. No cache invalidation needed: impersonating a player doesn't
// change any player data.
export function useImpersonatePlayer() {
  const t = useTranslations("PlayersDirectoryData");
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      fetchJson<{ url: string }>(
        "/api/admin/impersonate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
        t("genericError"),
      ),
    onSuccess: ({ url }) => {
      window.open(url, "_blank");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

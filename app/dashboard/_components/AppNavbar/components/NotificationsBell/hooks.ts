"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/core/notifications/types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export const notificationsQueryKey = ["notifications"];

export function useNotifications() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () =>
      fetchJson<{ notifications: Notification[]; unreadCount: number }>(
        "/api/notifications",
      ),
    refetchInterval: 30_000,
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>("/api/notifications/read-all", {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });
}

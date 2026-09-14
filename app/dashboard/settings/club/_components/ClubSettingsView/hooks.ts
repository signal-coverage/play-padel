"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ClubSettingsFormValues, ClubRecord } from "./types";

const CLUB_QUERY_KEY = ["clubs", "current"] as const;

async function fetchJson<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackErrorMessage: string,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallbackErrorMessage);
  }
  return res.json();
}

// With a clubId, this routes through the admin-only endpoints (and keys the
// query cache by clubId, so switching clubs in AdminClubSettingsView's picker
// never shows stale data from a previously-selected club). Without one, this
// is byte-identical to the original self-club, owner-only endpoint/key.
function clubEndpoint(clubId?: string): string {
  return clubId ? `/api/admin/clubs/${clubId}` : "/api/clubs";
}

function clubQueryKey(clubId?: string) {
  return clubId ? (["clubs", "admin", clubId] as const) : CLUB_QUERY_KEY;
}

export function useCurrentClub(clubId?: string) {
  const t = useTranslations("ClubSettingsViewData");
  return useQuery({
    queryKey: clubQueryKey(clubId),
    queryFn: () =>
      fetchJson<{ club: ClubRecord }>(
        clubEndpoint(clubId),
        undefined,
        t("genericError"),
      ).then((data) => data.club),
  });
}

export function useUpdateClub(clubId?: string) {
  const t = useTranslations("ClubSettingsViewData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ClubSettingsFormValues>) =>
      fetchJson<{ club: ClubRecord }>(
        clubEndpoint(clubId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubQueryKey(clubId) });
      toast.success(t("updated"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

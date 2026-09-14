"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AvailabilityEntry } from "@/core/courts/types";

const OPERATING_HOURS_QUERY_KEY = ["club-operating-hours", "settings"] as const;

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

export function useClubOperatingHours() {
  const t = useTranslations("OperatingHoursSettingsCardData");
  return useQuery({
    queryKey: OPERATING_HOURS_QUERY_KEY,
    queryFn: () =>
      fetchJson<{ operatingHours: AvailabilityEntry[] }>(
        "/api/clubs/operating-hours",
        undefined,
        t("genericError"),
      ).then((data) => data.operatingHours),
  });
}

export function useSetClubOperatingHours() {
  const t = useTranslations("OperatingHoursSettingsCardData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entries: AvailabilityEntry[]) =>
      fetchJson<{ operatingHours: AvailabilityEntry[] }>(
        "/api/clubs/operating-hours",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entries),
        },
        t("genericError"),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(OPERATING_HOURS_QUERY_KEY, data.operatingHours);
      toast.success(t("saved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

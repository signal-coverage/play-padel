"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { AdminMetrics } from "./types";

async function fetchAdminMetrics(
  fallbackErrorMessage: string,
): Promise<AdminMetrics> {
  const res = await fetch("/api/admin/metrics");
  if (!res.ok) {
    throw new Error(fallbackErrorMessage);
  }
  const data = await res.json();
  return data.metrics;
}

export function useAdminMetrics() {
  const t = useTranslations("AdminDashboardHomeData");
  return useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => fetchAdminMetrics(t("failedToLoadMetrics")),
  });
}

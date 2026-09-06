"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminMetrics } from "./types";

async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const res = await fetch("/api/admin/metrics");
  if (!res.ok) {
    throw new Error("Failed to load admin metrics");
  }
  const data = await res.json();
  return data.metrics;
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: fetchAdminMetrics,
  });
}

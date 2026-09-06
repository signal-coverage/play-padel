"use client";

import { useQuery } from "@tanstack/react-query";
import { toSystemStatusData } from "./utils";
import type { RawSystemStatusResponse } from "./types";

async function fetchSystemStatus() {
  const res = await fetch("/api/admin/system-status");
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error("Failed to load system status");
  }
  return toSystemStatusData(body as RawSystemStatusResponse);
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ["admin", "system-status"],
    queryFn: fetchSystemStatus,
  });
}

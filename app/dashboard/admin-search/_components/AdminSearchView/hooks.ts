"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminSearchResults } from "./types";

/**
 * Generic trailing-edge debounce: `value` only updates once `delayMs` has
 * elapsed with no further change. No shared debounce utility exists yet
 * elsewhere in this codebase (checked before writing this), so this stays
 * local to this folder per the SRP-per-folder convention.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

async function fetchAdminSearch(query: string): Promise<AdminSearchResults> {
  const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error("Failed to search");
  }
  return res.json();
}

/**
 * Only fires GET /api/admin/search once `query` (the already-debounced,
 * trimmed value) is non-empty — an empty query renders a distinct "start
 * typing" state (see AdminSearchView.tsx) rather than hitting the API, even
 * though the route itself tolerates an empty `q` gracefully.
 */
export function useAdminSearch(query: string) {
  return useQuery({
    queryKey: ["admin", "search", query],
    queryFn: () => fetchAdminSearch(query),
    enabled: query.length > 0,
  });
}

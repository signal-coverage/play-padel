"use client";

import { useQuery } from "@tanstack/react-query";
import { toDateParam } from "./utils";
import type { OwnerReservationSummaryDay } from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

/** Owner-only: per-day reservation counts for an inclusive date range. Shared
 * by every owner-facing dashboard card, so the fetch lives here once instead
 * of being duplicated per card. */
export function useOwnerReservationSummary(from: Date, to: Date) {
  const fromKey = toDateParam(from);
  const toKey = toDateParam(to);

  return useQuery({
    queryKey: ["owner-reservations-summary", fromKey, toKey],
    queryFn: () =>
      fetchJson<{ days: OwnerReservationSummaryDay[] }>(
        `/api/clubs/reservations/summary?from=${fromKey}&to=${toKey}`,
      ).then((data) => data.days),
  });
}

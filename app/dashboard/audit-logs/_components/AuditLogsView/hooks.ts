"use client";

import { useQuery } from "@tanstack/react-query";
import { AUDIT_LOGS_PAGE_SIZE } from "./consts";
import { toAuditLogRecord } from "./utils";
import type { AuditLogFiltersState, RawAuditLogRecord } from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export function useAuditLogs(filters: AuditLogFiltersState) {
  const params = new URLSearchParams();
  if (filters.entity) params.set("entity", filters.entity);
  if (filters.action) params.set("action", filters.action);
  params.set("page", String(filters.page));
  params.set("pageSize", String(AUDIT_LOGS_PAGE_SIZE));

  return useQuery({
    queryKey: ["audit-logs", filters.entity, filters.action, filters.page],
    queryFn: () =>
      // Global admin endpoint — the audit-logs page is admin-only now (see
      // page.tsx's AdminOnlyGuard), so this always requests the cross-club
      // view rather than the owner-scoped app/api/clubs/audit-logs route.
      fetchJson<{ logs: RawAuditLogRecord[]; total: number }>(
        `/api/admin/audit-logs?${params.toString()}`,
      ).then((data) => ({
        logs: data.logs.map(toAuditLogRecord),
        total: data.total,
      })),
  });
}

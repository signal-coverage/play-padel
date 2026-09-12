"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AUDIT_LOGS_PAGE_SIZE } from "./consts";
import { useAuditLogs } from "./hooks";
import { AuditLogsFilters } from "./components/AuditLogsFilters";
import { AuditLogsTable } from "./components/AuditLogsTable";
import type { AuditLogFiltersState } from "./types";

export function AuditLogsView() {
  const [filters, setFilters] = useState<AuditLogFiltersState>({ page: 1 });
  const { data, isLoading, isError } = useAuditLogs(filters);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_LOGS_PAGE_SIZE));

  // Any filter change resets to page 1 — a stale page number from a wider
  // result set could otherwise land past the end of a narrower one.
  function updateFilters(patch: Partial<Omit<AuditLogFiltersState, "page">>) {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          A record of changes made to your club, courts, and reservations.
        </p>
      </div>

      <AuditLogsFilters
        entity={filters.entity}
        action={filters.action}
        onEntityChange={(entity) => updateFilters({ entity })}
        onActionChange={(action) => updateFilters({ action })}
      />

      {isError ? (
        <p className="text-sm text-destructive">
          Could not load the audit log. Try again later.
        </p>
      ) : (
        <AuditLogsTable
          // Same fix as PlayersDirectory's table
          // (app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx)
          // — see its own comments for the full explanation. <main>
          // (DashboardShell.tsx) is overflow-y-auto (whole-page scroll)
          // below md, not md:overflow-hidden, so the h-full/flex-1 chain
          // this table normally stretches against collapses there;
          // min-h-[60svh] doesn't depend on that chain, md:min-h-0 restores
          // the exact previous desktop sizing.
          className="min-h-[60svh] flex-1 md:min-h-0"
          logs={data?.logs ?? []}
          isLoading={isLoading}
        />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {filters.page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page >= totalPages}
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      </div>

      {/* Real spacer box (height, not margin/padding), mobile only — see
          PlayersDirectory.tsx's identical spacer for the full explanation
          of why margin/padding doesn't work here. Placed after the
          pagination footer (not right after the table) since that footer
          is genuinely the last thing on the page. */}
      <div className="h-8 shrink-0 md:hidden" aria-hidden="true" />
    </div>
  );
}

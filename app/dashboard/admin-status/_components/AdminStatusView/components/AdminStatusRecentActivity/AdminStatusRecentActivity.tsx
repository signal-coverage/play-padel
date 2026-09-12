import { useMemo, useState } from "react";
import { format } from "date-fns";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { JOB_LABELS } from "../../consts";
import { SystemJobErrorDialog } from "./components/SystemJobErrorDialog";
import type { DataTableColumn } from "@/components/DataTable";
import type { SystemJobLogRecord } from "../../types";
import type { AdminStatusRecentActivityProps } from "./types";

/** Falls back to the raw job name for any value outside the known set —
 * `SystemJobLog.name` is a plain string column, not an enum, so this stays
 * resilient to a stray/legacy value rather than throwing (mirrors
 * AuditLogsView/utils.ts's getActionLabel). */
function getJobLabel(name: string): string {
  return (JOB_LABELS as Record<string, string>)[name] ?? name;
}

/**
 * The last ~50 SystemJobLog entries across every job, newest first (see
 * GET /api/admin/system-status's `recent`, backed by listRecentSystemJobs).
 */
export function AdminStatusRecentActivity({
  entries,
  isLoading,
}: AdminStatusRecentActivityProps) {
  // The row whose error is currently open in the detail modal — a single
  // piece of "which one" state (same pattern as RejectConfirmDialog's own
  // `target`), rather than one Dialog instance mounted per row.
  const [selectedEntry, setSelectedEntry] = useState<SystemJobLogRecord | null>(
    null,
  );

  const columns: DataTableColumn<SystemJobLogRecord>[] = useMemo(
    () => [
      {
        key: "when",
        header: "When",
        className: "whitespace-nowrap tabular-nums text-muted-foreground",
        cell: (entry) => format(entry.createdAt, "MMM d, HH:mm:ss"),
        loadingCell: <Skeleton className="h-4 w-28" />,
      },
      {
        key: "job",
        header: "Job",
        cell: (entry) => getJobLabel(entry.name),
        loadingCell: <Skeleton className="h-4 w-40" />,
      },
      {
        key: "kind",
        header: "Kind",
        cell: (entry) => (entry.kind === "CRON" ? "Cron" : "Webhook"),
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "status",
        header: "Status",
        cell: (entry) => (
          <Badge
            variant={entry.status === "SUCCESS" ? "success" : "destructive"}
          >
            {entry.status === "SUCCESS" ? "Success" : "Failure"}
          </Badge>
        ),
        loadingCell: <Skeleton className="h-5 w-20 rounded-full" />,
      },
      {
        key: "error",
        header: "Error",
        className: "max-w-xs text-muted-foreground",
        // Always clickable when there IS an error, regardless of length —
        // `truncate` alone (the old behavior) made a long error impossible
        // to ever actually read, with no way to see the rest. `block w-full
        // truncate` keeps the same one-line-ellipsis look for the trigger
        // itself; SystemJobErrorDialog is where the complete text lives.
        cell: (entry) =>
          entry.errorMessage ? (
            <button
              type="button"
              onClick={() => setSelectedEntry(entry)}
              className="block w-full truncate text-left underline-offset-2 hover:text-foreground hover:underline"
            >
              {entry.errorMessage}
            </button>
          ) : (
            "—"
          ),
        loadingCell: <Skeleton className="h-4 w-32" />,
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        // Same fix as PlayersDirectory's table
        // (app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx)
        // — see its own comments for the full explanation. <main>
        // (DashboardShell.tsx) is overflow-y-auto (whole-page scroll) below
        // md, not md:overflow-hidden, so the h-full/flex-1 chain this table
        // normally stretches against collapses there; min-h-[60svh] doesn't
        // depend on that chain, md:min-h-0 restores the exact previous
        // desktop sizing. The trailing spacer lives in AdminStatusView.tsx,
        // right after this component.
        className="min-h-[60svh] flex-1 md:min-h-0"
        columns={columns}
        rows={entries}
        rowKey={(entry) => entry.id}
        isLoading={isLoading}
        loadingLabel="Loading recent activity…"
        emptyState={<StatusBox>No system job activity recorded yet.</StatusBox>}
      />

      <SystemJobErrorDialog
        open={selectedEntry !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
        jobLabel={selectedEntry ? getJobLabel(selectedEntry.name) : ""}
        when={
          selectedEntry
            ? format(selectedEntry.createdAt, "MMM d, HH:mm:ss")
            : ""
        }
        errorMessage={selectedEntry?.errorMessage ?? ""}
      />
    </>
  );
}

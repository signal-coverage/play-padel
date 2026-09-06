import { useMemo } from "react";
import { format } from "date-fns";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { JOB_LABELS } from "../../consts";
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
        className: "max-w-xs truncate text-muted-foreground",
        cell: (entry) => entry.errorMessage ?? "—",
        loadingCell: <Skeleton className="h-4 w-32" />,
      },
    ],
    [],
  );

  return (
    <DataTable
      className="min-h-0 flex-1"
      columns={columns}
      rows={entries}
      rowKey={(entry) => entry.id}
      isLoading={isLoading}
      loadingLabel="Loading recent activity…"
      emptyState={<StatusBox>No system job activity recorded yet.</StatusBox>}
    />
  );
}

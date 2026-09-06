import { useMemo } from "react";
import { format } from "date-fns";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { JOB_LABELS, KNOWN_SYSTEM_JOBS } from "../../consts";
import type { DataTableColumn } from "@/components/DataTable";
import type { SystemJobLogRecord } from "../../types";
import type { AdminStatusSummaryProps } from "./types";

type SummaryRow = {
  name: string;
  label: string;
  latest: SystemJobLogRecord | null;
};

/**
 * "At a glance" row per known job (see core/systemJobs/consts's
 * KNOWN_SYSTEM_JOBS — 3 cron routes + 2 webhook receivers), backed by
 * GET /api/admin/system-status's `summary` (getLatestStatusPerJob). A job
 * that has never logged a run renders "Never run" rather than a status
 * badge.
 */
export function AdminStatusSummary({
  summary,
  isLoading,
}: AdminStatusSummaryProps) {
  const rows: SummaryRow[] = useMemo(
    () =>
      KNOWN_SYSTEM_JOBS.map(({ name }) => ({
        name,
        label: JOB_LABELS[name],
        latest: summary[name] ?? null,
      })),
    [summary],
  );

  const columns: DataTableColumn<SummaryRow>[] = useMemo(
    () => [
      {
        key: "job",
        header: "Job",
        cell: (row) => row.label,
        loadingCell: <Skeleton className="h-4 w-40" />,
      },
      {
        key: "lastRun",
        header: "Last run",
        className: "whitespace-nowrap tabular-nums text-muted-foreground",
        cell: (row) =>
          row.latest ? format(row.latest.finishedAt, "MMM d, HH:mm") : "—",
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
      {
        key: "status",
        header: "Status",
        cell: (row) =>
          row.latest ? (
            <Badge
              variant={
                row.latest.status === "SUCCESS" ? "success" : "destructive"
              }
            >
              {row.latest.status === "SUCCESS" ? "Success" : "Failure"}
            </Badge>
          ) : (
            <Badge variant="outline">Never run</Badge>
          ),
        loadingCell: <Skeleton className="h-5 w-20 rounded-full" />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.name}
      isLoading={isLoading}
      loadingLabel="Loading system status…"
      loadingRowCount={KNOWN_SYSTEM_JOBS.length}
      emptyState={null}
    />
  );
}

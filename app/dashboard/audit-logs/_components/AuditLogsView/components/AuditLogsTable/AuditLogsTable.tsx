import { useMemo } from "react";
import { format } from "date-fns";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getActionLabel } from "../../utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { AuditLogsTableProps } from "./types";

type AuditLogRow = AuditLogsTableProps["logs"][number];

export function AuditLogsTable({ logs, isLoading }: AuditLogsTableProps) {
  const columns: DataTableColumn<AuditLogRow>[] = useMemo(
    () => [
      {
        key: "when",
        header: "When",
        className: "whitespace-nowrap tabular-nums text-muted-foreground",
        cell: (log) => format(log.timestamp, "MMM d, HH:mm"),
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
      {
        key: "action",
        header: "Action",
        cell: (log) => (
          <Badge variant="outline">{getActionLabel(log.action)}</Badge>
        ),
        loadingCell: <Skeleton className="h-5 w-20 rounded-full" />,
      },
      {
        key: "entity",
        header: "Entity",
        cell: (log) => log.entity,
        loadingCell: <Skeleton className="h-4 w-28" />,
      },
      {
        key: "by",
        header: "By",
        cell: (log) => log.userDisplayName,
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={logs}
      rowKey={(log) => log.id}
      isLoading={isLoading}
      loadingLabel="Loading audit log…"
      emptyState={
        <StatusBox>No audit log entries match these filters.</StatusBox>
      }
    />
  );
}

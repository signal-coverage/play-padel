import { useMemo } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getActionLabel } from "../../utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { AuditLogsTableProps } from "./types";

type AuditLogRow = AuditLogsTableProps["logs"][number];

export function AuditLogsTable({
  logs,
  isLoading,
  className,
}: AuditLogsTableProps) {
  const t = useTranslations("AuditLogsTable");
  const tActionLabels = useTranslations("AuditActionLabels");
  const columns: DataTableColumn<AuditLogRow>[] = useMemo(
    () => [
      {
        key: "when",
        header: t("when"),
        className: "whitespace-nowrap tabular-nums text-muted-foreground",
        cell: (log) => format(log.timestamp, "MMM d, HH:mm"),
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
      {
        key: "action",
        header: t("action"),
        cell: (log) => (
          <Badge variant="outline">
            {getActionLabel(log.action, tActionLabels)}
          </Badge>
        ),
        loadingCell: <Skeleton className="h-5 w-20 rounded-full" />,
      },
      {
        key: "entity",
        header: t("entity"),
        cell: (log) => log.entity,
        loadingCell: <Skeleton className="h-4 w-28" />,
      },
      {
        key: "by",
        header: t("by"),
        cell: (log) => log.userDisplayName,
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
    ],
    [t, tActionLabels],
  );

  return (
    <DataTable
      className={className}
      columns={columns}
      rows={logs}
      rowKey={(log) => log.id}
      isLoading={isLoading}
      loadingLabel={t("loading")}
      emptyState={<StatusBox>{t("empty")}</StatusBox>}
    />
  );
}

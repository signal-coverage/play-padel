"use client";

import { useMemo } from "react";
import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeRange, isActionable } from "../../utils";
import { ReservationActionButtons } from "../ReservationActionButtons";
import type { DataTableColumn } from "@/components/DataTable";
import type { ReservationsTableProps } from "./types";

type ReservationRow = ReservationsTableProps["reservations"][number];

export function ReservationsTable({
  reservations,
  isLoading,
  onAction,
  pendingReservationId,
}: ReservationsTableProps) {
  const columns: DataTableColumn<ReservationRow>[] = useMemo(
    () => [
      {
        key: "player",
        header: "Player",
        className: "font-medium",
        cell: (reservation) => reservation.userName,
        loadingCell: <Skeleton className="h-4 w-28" />,
      },
      {
        key: "court",
        header: "Court",
        cell: (reservation) => reservation.courtName,
        loadingCell: <Skeleton className="h-4 w-20" />,
      },
      {
        key: "time",
        header: "Time",
        className: "tabular-nums",
        cell: (reservation) =>
          formatTimeRange(reservation.scheduledStart, reservation.scheduledEnd),
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
      {
        key: "status",
        header: "Status",
        cell: (reservation) => (
          <ReservationStatusBadge status={reservation.status} />
        ),
        loadingCell: <Skeleton className="h-5 w-20 rounded-full" />,
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "text-right",
        className: "text-right",
        cell: (reservation) => {
          const isPending = pendingReservationId === reservation.id;
          if (!isActionable(reservation.status)) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex justify-end gap-1">
              <ReservationActionButtons
                reservationId={reservation.id}
                onAction={onAction}
                isPending={isPending}
                size="sm"
              />
            </div>
          );
        },
        loadingCell: (
          <div className="flex justify-end gap-1.5">
            <Skeleton className="h-8 w-16 rounded-sm" />
            <Skeleton className="h-8 w-16 rounded-sm" />
          </div>
        ),
      },
    ],
    [onAction, pendingReservationId],
  );

  return (
    <DataTable
      columns={columns}
      rows={reservations}
      rowKey={(reservation) => reservation.id}
      isLoading={isLoading}
      loadingLabel="Loading reservations…"
      emptyState={<StatusBox>No reservations for this day.</StatusBox>}
    />
  );
}

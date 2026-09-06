import { format } from "date-fns";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBox } from "@/components/StatusBox";
import { SCHEDULED_START_FORMAT } from "./consts";
import type { DataTableColumn } from "@/components/DataTable";
import type { AdminSearchReservationResultsProps } from "./types";
import type { AdminSearchReservationResult } from "../../types";

// Not clickable — no reservation detail surface exists yet, same rationale
// as AdminSearchPlayerResults.
export function AdminSearchReservationResults({
  reservations,
  isLoading,
}: AdminSearchReservationResultsProps) {
  const columns: DataTableColumn<AdminSearchReservationResult>[] = [
    {
      key: "reservation",
      header: "Reservation",
      cell: (reservation) => (
        <div className="flex flex-col gap-1 py-0.5">
          <span className="font-medium">{reservation.courtName}</span>
          <span className="text-muted-foreground">
            {reservation.playerName} ·{" "}
            {format(
              new Date(reservation.scheduledStart),
              SCHEDULED_START_FORMAT,
            )}
          </span>
        </div>
      ),
      loadingCell: <Skeleton className="h-10 w-full" />,
    },
    {
      key: "status",
      header: "Status",
      cell: (reservation) => (
        <Badge variant="outline">{reservation.status}</Badge>
      ),
      loadingCell: <Skeleton className="h-5 w-16 rounded-full" />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={reservations}
      rowKey={(reservation) => reservation.id}
      isLoading={isLoading}
      loadingLabel="Searching reservations…"
      emptyState={<StatusBox>No reservations found.</StatusBox>}
    />
  );
}

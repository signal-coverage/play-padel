"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RESERVATION_STATUS_LABELS } from "@/core/reservations/consts";
import { formatTimeRange, isActionable } from "../../utils";
import { STATUS_BADGE_VARIANT } from "./consts";
import type { ReservationsTableProps } from "./types";

export function ReservationsTable({
  reservations,
  isLoading,
  onAction,
  pendingReservationId,
}: ReservationsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Loading reservations…
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No reservations for this day.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Court</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => {
            const isPending = pendingReservationId === reservation.id;
            const actionable = isActionable(reservation.status);

            return (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">
                  {reservation.userName}
                </TableCell>
                <TableCell>{reservation.courtName}</TableCell>
                <TableCell>
                  {formatTimeRange(
                    reservation.scheduledStart,
                    reservation.scheduledEnd,
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[reservation.status]}>
                    {RESERVATION_STATUS_LABELS[reservation.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {actionable ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => onAction(reservation.id, "complete")}
                      >
                        Complete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => onAction(reservation.id, "noShow")}
                      >
                        No-show
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => onAction(reservation.id, "cancel")}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

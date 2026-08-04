"use client";

import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { StatusBox } from "@/components/StatusBox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTimeRange, isActionable } from "../../utils";
import { ReservationActionButtons } from "../ReservationActionButtons";
import type { ReservationsTableProps } from "./types";

export function ReservationsTable({
  reservations,
  isLoading,
  onAction,
  pendingReservationId,
}: ReservationsTableProps) {
  if (isLoading) {
    return <StatusBox>Loading reservations…</StatusBox>;
  }

  if (reservations.length === 0) {
    return <StatusBox>No reservations for this day.</StatusBox>;
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
                  <ReservationStatusBadge status={reservation.status} />
                </TableCell>
                <TableCell className="text-right">
                  {actionable ? (
                    <div className="flex justify-end gap-1">
                      <ReservationActionButtons
                        reservationId={reservation.id}
                        onAction={onAction}
                        isPending={isPending}
                        size="sm"
                      />
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

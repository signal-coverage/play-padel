"use client";

import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { StatusBox } from "@/components/StatusBox";
import { Skeleton } from "@/components/ui/skeleton";
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
import { LOADING_SKELETON_ROW_COUNT } from "./consts";
import type { ReservationsTableProps } from "./types";

export function ReservationsTable({
  reservations,
  isLoading,
  onAction,
  pendingReservationId,
}: ReservationsTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-sm border">
        <span className="sr-only" role="status">
          Loading reservations…
        </span>
        <Table aria-hidden="true">
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
            {Array.from({ length: LOADING_SKELETON_ROW_COUNT }).map(
              (_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-16 rounded-sm" />
                      <Skeleton className="h-8 w-16 rounded-sm" />
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (reservations.length === 0) {
    return <StatusBox>No reservations for this day.</StatusBox>;
  }

  return (
    <div className="overflow-x-auto rounded-sm border">
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
                <TableCell className="tabular-nums">
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

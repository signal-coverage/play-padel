"use client";

import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { StatValue } from "@/components/StatValue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTimeRange, isActionable } from "../../utils";
import { ReservationActionButtons } from "../ReservationActionButtons";
import type { SlotDetailsDialogProps } from "./types";

export function SlotDetailsDialog({
  open,
  onOpenChange,
  reservation,
  onAction,
  isPending,
}: SlotDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-balance">
            Reservation details
          </DialogTitle>
          <DialogDescription className="text-pretty">
            {reservation
              ? "This slot is booked."
              : "Reservation details are unavailable for this slot."}
          </DialogDescription>
        </DialogHeader>

        {reservation && (
          <div className="flex flex-col gap-2 text-sm">
            <StatValue
              variant="row"
              label="Player"
              value={reservation.userName}
            />
            <StatValue
              variant="row"
              label="Court"
              value={reservation.courtName}
            />
            <StatValue
              variant="row"
              label="Time"
              value={formatTimeRange(
                reservation.scheduledStart,
                reservation.scheduledEnd,
              )}
            />
            <StatValue
              variant="row"
              label="Status"
              value={reservation.status}
              valueSlot={<ReservationStatusBadge status={reservation.status} />}
            />
            {reservation.notes && (
              <StatValue
                variant="row"
                label="Notes"
                value={reservation.notes}
              />
            )}
          </div>
        )}

        {reservation && isActionable(reservation.status) && (
          <DialogFooter>
            <ReservationActionButtons
              reservationId={reservation.id}
              onAction={onAction}
              isPending={isPending}
            />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RESERVATION_STATUS_LABELS } from "@/core/reservations/consts";
import { STATUS_BADGE_VARIANT } from "../ReservationsTable/consts";
import { formatTimeRange, isActionable } from "../../utils";
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
          <DialogTitle>Reservation details</DialogTitle>
          <DialogDescription>
            {reservation
              ? "This slot is booked."
              : "Reservation details are unavailable for this slot."}
          </DialogDescription>
        </DialogHeader>

        {reservation && (
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Player" value={reservation.userName} />
            <Row label="Court" value={reservation.courtName} />
            <Row
              label="Time"
              value={formatTimeRange(
                reservation.scheduledStart,
                reservation.scheduledEnd,
              )}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={STATUS_BADGE_VARIANT[reservation.status]}>
                {RESERVATION_STATUS_LABELS[reservation.status]}
              </Badge>
            </div>
            {reservation.notes && (
              <Row label="Notes" value={reservation.notes} />
            )}
          </div>
        )}

        {reservation && isActionable(reservation.status) && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onAction(reservation.id, "complete")}
            >
              Complete
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onAction(reservation.id, "noShow")}
            >
              No-show
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => onAction(reservation.id, "cancel")}
            >
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

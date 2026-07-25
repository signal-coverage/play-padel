"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BookingConfirmDialogProps } from "./types";
import { formatSlotRange } from "./utils";

export function BookingConfirmDialog({
  open,
  onOpenChange,
  courtName,
  slot,
  isSubmitting,
  onConfirm,
}: BookingConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm reservation</DialogTitle>
          <DialogDescription>
            {slot ? `${courtName} · ${formatSlotRange(slot.start, slot.end)}` : null}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          No payment is required now — you pay at the club. You can cancel
          for free up to 2 hours before your reservation.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Booking…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

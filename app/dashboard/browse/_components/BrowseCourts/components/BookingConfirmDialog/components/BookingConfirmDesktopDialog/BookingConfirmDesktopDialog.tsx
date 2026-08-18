"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookingConfirmActions } from "../BookingConfirmActions";
import { BookingConfirmSummary } from "../BookingConfirmSummary";
import type { BookingConfirmDialogProps } from "../../types";
import { getBookingConfirmMessage, getBookingPaymentState } from "../../utils";

/** Centered dialog variant of the booking confirmation, used on larger viewports. */
export function BookingConfirmDesktopDialog({
  open,
  onOpenChange,
  courtName,
  slot,
  price,
  currency,
  isSubmitting,
  onConfirm,
}: BookingConfirmDialogProps) {
  const paymentState = getBookingPaymentState(price);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Confirm reservation</DialogTitle>
          <DialogDescription className="sr-only">
            Review your reservation details and confirm.
          </DialogDescription>
        </DialogHeader>

        <BookingConfirmSummary
          courtName={courtName}
          slot={slot}
          paymentState={paymentState}
          currency={currency}
        />

        <p className="text-xs text-muted-foreground">
          {getBookingConfirmMessage(paymentState, currency)}
        </p>
        <DialogFooter>
          <BookingConfirmActions
            paymentState={paymentState}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

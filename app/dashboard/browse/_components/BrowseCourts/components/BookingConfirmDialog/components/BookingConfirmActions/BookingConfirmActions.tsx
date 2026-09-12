"use client";

import { Button } from "@/components/ui/button";
import { GuardedActionButton } from "@/components/GuardedActionButton";
import { canConfirmBooking } from "../../utils";
import type { BookingConfirmActionsProps } from "./types";

/**
 * Cancel + confirm buttons shared by the desktop dialog and mobile drawer
 * variants of the booking confirmation flow, so the two wrappers only differ
 * in their surrounding chrome (Dialog vs Drawer).
 */
export function BookingConfirmActions({
  paymentState,
  isSubmitting,
  onCancel,
  onConfirm,
  selectedMethod,
  confirmedTransferPending,
}: BookingConfirmActionsProps) {
  const canConfirm = canConfirmBooking(paymentState);

  // Once a TRANSFER booking has come back as a pending hold, there's nothing
  // left to confirm or cancel — just a single dismiss action that leaves the
  // bank details visible until the player closes the dialog themselves.
  if (confirmedTransferPending) {
    return (
      <GuardedActionButton
        isPending={false}
        disabled={false}
        onClick={onCancel}
      >
        Got it
      </GuardedActionButton>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <GuardedActionButton
        isPending={isSubmitting}
        disabled={!canConfirm}
        onClick={onConfirm}
      >
        {isSubmitting
          ? "Booking…"
          : paymentState.kind === "pay-now"
            ? selectedMethod === "TRANSFER"
              ? "Confirm booking"
              : "Continue to payment"
            : paymentState.kind === "price-missing"
              ? "Price not set"
              : "Book court"}
      </GuardedActionButton>
    </>
  );
}

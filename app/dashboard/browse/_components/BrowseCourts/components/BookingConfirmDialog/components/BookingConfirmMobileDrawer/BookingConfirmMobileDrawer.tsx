"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { BookingConfirmActions } from "../BookingConfirmActions";
import { BookingConfirmSummary } from "../BookingConfirmSummary";
import type { BookingConfirmDialogProps } from "../../types";
import { getBookingConfirmMessage, getBookingPaymentState } from "../../utils";

/** Bottom-sheet variant of the booking confirmation, used on small viewports. */
export function BookingConfirmMobileDrawer({
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DrawerHeader>
          <DrawerTitle>Confirm reservation</DrawerTitle>
          <DrawerDescription className="sr-only">
            Review your reservation details and confirm.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-4">
          <BookingConfirmSummary
            courtName={courtName}
            slot={slot}
            paymentState={paymentState}
            currency={currency}
          />

          <p className="text-xs text-muted-foreground">
            {getBookingConfirmMessage(paymentState, currency)}
          </p>
        </div>

        <DrawerFooter>
          <BookingConfirmActions
            paymentState={paymentState}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

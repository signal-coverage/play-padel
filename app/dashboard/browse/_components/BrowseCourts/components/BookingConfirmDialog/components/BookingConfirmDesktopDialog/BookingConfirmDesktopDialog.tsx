"use client";

import { useTranslations } from "next-intl";
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
import { PartnerPicker } from "../PartnerPicker";
import { PaymentMethodPicker } from "../PaymentMethodPicker";
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
  partnerIds,
  onPartnerIdsChange,
  currentUserId,
  availableMethods,
  selectedMethod,
  onSelectMethod,
  bankTransferInfo,
  confirmedTransferPending,
}: BookingConfirmDialogProps) {
  const t = useTranslations("BookingConfirmDialog");
  const paymentState = getBookingPaymentState(price);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <BookingConfirmSummary
          courtName={courtName}
          slot={slot}
          paymentState={paymentState}
          currency={currency}
        />

        {paymentState.kind === "pay-now" && (
          <PaymentMethodPicker
            availableMethods={availableMethods}
            selectedMethod={selectedMethod}
            onSelectMethod={onSelectMethod}
          />
        )}

        <p className="text-xs text-muted-foreground">
          {getBookingConfirmMessage(paymentState, currency, selectedMethod, t)}
        </p>

        {selectedMethod === "TRANSFER" && bankTransferInfo && (
          <div className="flex flex-col gap-1 rounded-sm border bg-muted/40 p-3 text-xs">
            <p>
              <span className="font-medium">{t("bank")}</span>{" "}
              {bankTransferInfo.bankName}
            </p>
            <p>
              <span className="font-medium">{t("cbu")}</span>{" "}
              {bankTransferInfo.cbu}
            </p>
            {bankTransferInfo.alias && (
              <p>
                <span className="font-medium">{t("alias")}</span>{" "}
                {bankTransferInfo.alias}
              </p>
            )}
            <p>
              <span className="font-medium">{t("whatsapp")}</span>{" "}
              {bankTransferInfo.whatsappNumber}
            </p>
          </div>
        )}

        <PartnerPicker
          selectedIds={partnerIds}
          onChange={onPartnerIdsChange}
          excludeUserId={currentUserId}
        />

        <DialogFooter>
          <BookingConfirmActions
            paymentState={paymentState}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
            selectedMethod={selectedMethod}
            confirmedTransferPending={confirmedTransferPending}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

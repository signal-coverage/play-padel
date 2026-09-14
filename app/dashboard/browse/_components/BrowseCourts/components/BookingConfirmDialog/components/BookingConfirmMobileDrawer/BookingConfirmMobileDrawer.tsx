"use client";

import { useTranslations } from "next-intl";
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
import { PartnerPicker } from "../PartnerPicker";
import { PaymentMethodPicker } from "../PaymentMethodPicker";
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DrawerHeader>
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {t("description")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-4">
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
            {getBookingConfirmMessage(
              paymentState,
              currency,
              selectedMethod,
              t,
            )}
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
        </div>

        <DrawerFooter>
          <BookingConfirmActions
            paymentState={paymentState}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
            selectedMethod={selectedMethod}
            confirmedTransferPending={confirmedTransferPending}
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

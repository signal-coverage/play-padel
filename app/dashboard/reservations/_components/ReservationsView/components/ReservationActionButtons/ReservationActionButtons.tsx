"use client";

import { useTranslations } from "next-intl";
import { GuardedActionButton } from "@/components/GuardedActionButton";
import type { ReservationActionButtonsProps } from "./types";

/**
 * The Complete / No-show / Cancel action trio shared by `ReservationsTable`
 * (owner table row) and `SlotDetailsDialog` (owner detail dialog), plus an
 * optional leading "Confirm transfer" button for a pending unexpired
 * bank-transfer hold. Each button is a `GuardedActionButton`, so the
 * `isPending` guard and `aria-disabled` styling are handled once, not
 * reimplemented per call site.
 *
 * Callers are responsible for deciding *whether* to render this (gated by
 * `isActionable(reservation.status)`) and for the surrounding layout wrapper,
 * since that differs by context (table cell vs. dialog footer). Whether to
 * show "Confirm transfer" is gated separately, via `needsTransferConfirmation`.
 */
export function ReservationActionButtons({
  reservationId,
  onAction,
  isPending,
  size = "default",
  showConfirmTransfer = false,
}: ReservationActionButtonsProps) {
  const t = useTranslations("ReservationActionButtons");
  return (
    <>
      {showConfirmTransfer && (
        <GuardedActionButton
          type="button"
          variant="default"
          size={size}
          isPending={isPending}
          onClick={() => onAction(reservationId, "confirmTransfer")}
        >
          {t("confirmTransfer")}
        </GuardedActionButton>
      )}
      <GuardedActionButton
        type="button"
        variant="outline"
        size={size}
        isPending={isPending}
        onClick={() => onAction(reservationId, "complete")}
      >
        {t("complete")}
      </GuardedActionButton>
      <GuardedActionButton
        type="button"
        variant="outline"
        size={size}
        isPending={isPending}
        onClick={() => onAction(reservationId, "noShow")}
      >
        {t("noShow")}
      </GuardedActionButton>
      <GuardedActionButton
        type="button"
        variant="destructive"
        size={size}
        isPending={isPending}
        onClick={() => onAction(reservationId, "cancel")}
      >
        {t("cancel")}
      </GuardedActionButton>
    </>
  );
}

"use client";

import { useTranslations } from "next-intl";
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
import {
  formatTimeRange,
  isActionable,
  needsTransferConfirmation,
} from "../../utils";
import { ReservationActionButtons } from "../ReservationActionButtons";
import type { SlotDetailsDialogProps } from "./types";

export function SlotDetailsDialog({
  open,
  onOpenChange,
  reservation,
  onAction,
  isPending,
}: SlotDetailsDialogProps) {
  const t = useTranslations("SlotDetailsDialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => {
          // Only reservations with action buttons in the footer (Complete /
          // No-show / Cancel) should resist an accidental outside click —
          // a read-only reservation view (no actionable status) stays
          // dismissible like any plain info dialog.
          if (reservation && isActionable(reservation.status)) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-balance">{t("title")}</DialogTitle>
          <DialogDescription className="text-pretty">
            {reservation ? t("descriptionBooked") : t("descriptionUnavailable")}
          </DialogDescription>
        </DialogHeader>

        {reservation && (
          <div className="flex flex-col gap-2 text-sm">
            <StatValue
              variant="row"
              label={t("player")}
              value={reservation.userName}
            />
            <StatValue
              variant="row"
              label={t("court")}
              value={reservation.courtName}
            />
            <StatValue
              variant="row"
              label={t("time")}
              value={formatTimeRange(
                reservation.scheduledStart,
                reservation.scheduledEnd,
              )}
            />
            <StatValue
              variant="row"
              label={t("status")}
              value={reservation.status}
              valueSlot={<ReservationStatusBadge status={reservation.status} />}
            />
            {reservation.notes && (
              <StatValue
                variant="row"
                label={t("notes")}
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
              showConfirmTransfer={needsTransferConfirmation(reservation)}
            />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

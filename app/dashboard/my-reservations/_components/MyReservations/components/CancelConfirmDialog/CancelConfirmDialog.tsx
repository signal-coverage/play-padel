"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { CancelConfirmDialogProps } from "./types";
import { formatCancelTargetDateTime } from "./utils";

export function CancelConfirmDialog({
  open,
  onOpenChange,
  target,
  isSubmitting,
  onConfirm,
}: CancelConfirmDialogProps) {
  const t = useTranslations("CancelConfirmDialog");
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={
        target ? (
          <>
            {target.courtName} ·{" "}
            <span className="tabular-nums">
              {formatCancelTargetDateTime(target.scheduledStart)}
            </span>
          </>
        ) : undefined
      }
      cancelLabel={t("cancelLabel")}
      confirmLabel={t("confirmLabel")}
      pendingLabel={t("pendingLabel")}
      isPending={isSubmitting}
      onConfirm={onConfirm}
    />
  );
}

"use client";

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
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel reservation?"
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
      cancelLabel="Keep reservation"
      confirmLabel="Cancel reservation"
      pendingLabel="Cancelling…"
      isPending={isSubmitting}
      onConfirm={onConfirm}
    />
  );
}

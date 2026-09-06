"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { RejectConfirmDialogProps } from "./types";

// Reject is the consequential/destructive-ish direction of the two approval
// actions (see AdminApprovalsView.tsx) — same "confirm before a consequential
// mutation" convention as CancelConfirmDialog (app/dashboard/my-reservations)
// and DisconnectConfirmDialog (settings/club). Approve stays a direct action
// with no confirm step, since it's the non-destructive direction.
export function RejectConfirmDialog({
  open,
  onOpenChange,
  target,
  isSubmitting,
  onConfirm,
}: RejectConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reject this club?"
      description={target ? `${target.name} · ${target.email}` : undefined}
      cancelLabel="Keep pending"
      confirmLabel="Reject club"
      pendingLabel="Rejecting…"
      isPending={isSubmitting}
      onConfirm={onConfirm}
    />
  );
}

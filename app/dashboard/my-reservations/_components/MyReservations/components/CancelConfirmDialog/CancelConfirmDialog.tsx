"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GuardedActionButton } from "@/components/GuardedActionButton";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel reservation?</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.courtName} · ${formatCancelTargetDateTime(target.scheduledStart)}`
              : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Keep reservation
          </Button>
          <GuardedActionButton
            variant="destructive"
            isPending={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? "Cancelling…" : "Cancel reservation"}
          </GuardedActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

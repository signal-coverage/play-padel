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
import type { WalkoverDialogProps } from "./types";

/** Records a walkover — the owner just picks which team wins, no score. */
export function WalkoverDialog({
  open,
  onOpenChange,
  teamAId,
  teamALabel,
  teamBId,
  teamBLabel,
  onConfirm,
  isSubmitting,
}: WalkoverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a walkover</DialogTitle>
          <DialogDescription>
            Which team wins by walkover? No score will be recorded.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirm(teamAId)}
          >
            {teamALabel} wins
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onConfirm(teamBId)}
          >
            {teamBLabel} wins
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

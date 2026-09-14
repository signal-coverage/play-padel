"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("WalkoverDialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirm(teamAId)}
          >
            {t("teamWins", { teamLabel: teamALabel })}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onConfirm(teamBId)}
          >
            {t("teamWins", { teamLabel: teamBLabel })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

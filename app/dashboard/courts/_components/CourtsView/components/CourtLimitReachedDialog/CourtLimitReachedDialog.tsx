"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CourtLimitReachedDialogProps } from "./types";

// Shown instead of opening CourtFormSheet when the owner clicks "New court"
// while already at their plan's court limit (see CourtsView.tsx) — the
// button itself stays clickable (CSS-only disabled look), so this is the
// real gate on the frontend. The backend's own createCourt check (see
// core/courts/services/courts.service.ts) is the actual source of truth;
// this only exists to explain why the click didn't open the create form.
//
// The primary action deliberately links to /dashboard rather than embedding
// UpgradeMembershipButton's own PlanSelectionModal here: nesting one Radix
// Dialog inside another risks the exact DismissableLayer bug documented in
// AGENTS.md (a click inside the inner dialog can incorrectly dismiss this
// outer one, unmounting the inner one along with it, mid-upgrade-flow).
export function CourtLimitReachedDialog({
  open,
  onOpenChange,
  plan,
  limit,
}: CourtLimitReachedDialogProps) {
  const t = useTranslations("CourtLimitReachedDialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { plan, limit })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("close")}
          </Button>
          <Button type="button" asChild>
            <Link href="/dashboard">{t("goToDashboard")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

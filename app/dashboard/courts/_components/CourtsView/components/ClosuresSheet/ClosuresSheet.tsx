"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { summarizeClosureFanOut } from "@/core/courts/utils/closureFanOut";
import {
  useCancelCourtClosure,
  useCourtClosures,
  useCreateCourtClosure,
} from "../../hooks";
import { ClosuresList } from "./components/ClosuresList";
import { NewClosureForm } from "./components/NewClosureForm";
import type { NewClosureFormValues } from "./components/NewClosureForm/types";
import type { ClosuresSheetProps } from "./types";

export function ClosuresSheet({
  open,
  onOpenChange,
  court,
  courts,
}: ClosuresSheetProps) {
  const t = useTranslations("ClosuresSheet");
  const courtId = court?.id ?? null;
  const { data: closures, isLoading } = useCourtClosures(open ? courtId : null);
  const createClosure = useCreateCourtClosure();
  const cancelClosure = useCancelCourtClosure();
  const [closurePendingCancellation, setClosurePendingCancellation] = useState<
    string | null
  >(null);
  const handleCancelDialogClose = useGuardedDialogClose(
    cancelClosure.isPending,
    () => setClosurePendingCancellation(null),
  );

  async function handleCreate(values: NewClosureFormValues): Promise<boolean> {
    const targetCourtIds = values.applyToAllCourts
      ? courts.filter((c) => c.active).map((c) => c.id)
      : courtId
        ? [courtId]
        : [];

    if (targetCourtIds.length === 0) return false;

    const input = {
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
      reason: values.reason,
    };

    const results = await Promise.allSettled(
      targetCourtIds.map((id) =>
        createClosure.mutateAsync({ courtId: id, input }),
      ),
    );
    const outcome = summarizeClosureFanOut(results, {
      created: t("closureCreated"),
      createdForCourts: (count) => t("closureCreatedForCourts", { count }),
      failed: t("closureCreateFailed"),
      partial: (succeeded, total, failed) =>
        t("closurePartial", { succeeded, total, failed }),
    });

    if (outcome.toastTone === "success") {
      toast.success(outcome.toastMessage);
    } else {
      toast.error(outcome.toastMessage);
    }

    return outcome.allSucceeded;
  }

  async function handleConfirmCancel() {
    if (!courtId || !closurePendingCancellation) return;
    try {
      await cancelClosure.mutateAsync({
        courtId,
        closureId: closurePendingCancellation,
      });
      setClosurePendingCancellation(null);
    } catch {
      // useCancelCourtClosure's onError already surfaces a toast; leave the
      // dialog open so the user can retry or back out explicitly.
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onPointerDownOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>
            {court
              ? t("descriptionForCourt", { name: court.name })
              : t("description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <NewClosureForm
            onSubmit={handleCreate}
            isSubmitting={createClosure.isPending}
            showApplyToAllCourts={courts.length > 1}
          />

          {isLoading || !closures ? (
            <p className="text-sm text-muted-foreground">
              {t("loadingClosures")}
            </p>
          ) : (
            <ClosuresList
              closures={closures}
              onCancel={setClosurePendingCancellation}
              cancellingClosureId={
                cancelClosure.isPending
                  ? (cancelClosure.variables?.closureId ?? null)
                  : null
              }
            />
          )}
        </div>
      </SheetContent>

      <ConfirmDialog
        open={closurePendingCancellation !== null}
        onOpenChange={handleCancelDialogClose}
        title={t("cancelTitle")}
        description={t("cancelDescription")}
        cancelLabel={t("keepClosure")}
        confirmLabel={t("cancelClosure")}
        pendingLabel={t("cancelling")}
        isPending={cancelClosure.isPending}
        onConfirm={handleConfirmCancel}
      />
    </Sheet>
  );
}

"use client";

import { useState } from "react";
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
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    if (failures.length === 0) {
      toast.success(
        targetCourtIds.length > 1
          ? `Closure created for ${targetCourtIds.length} courts`
          : "Closure created",
      );
    } else if (failures.length === targetCourtIds.length) {
      toast.error(
        failures[0].reason instanceof Error
          ? failures[0].reason.message
          : "Failed to create closure",
      );
    } else {
      toast.error(
        `Created for ${targetCourtIds.length - failures.length} of ${targetCourtIds.length} courts. ${failures.length} conflicted — check each court's closures.`,
      );
    }

    return failures.length === 0;
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
          <SheetTitle>Closures</SheetTitle>
          <SheetDescription>
            {court
              ? `Block ${court.name} for maintenance, events, or planned closures.`
              : "Block this court for maintenance, events, or planned closures."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <NewClosureForm
            onSubmit={handleCreate}
            isSubmitting={createClosure.isPending}
            showApplyToAllCourts={courts.length > 1}
          />

          {isLoading || !closures ? (
            <p className="text-sm text-muted-foreground">Loading closures…</p>
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
        title="Cancel this closure?"
        description="This will make the court bookable again for its blocked time range."
        cancelLabel="Keep closure"
        confirmLabel="Cancel closure"
        pendingLabel="Cancelling…"
        isPending={cancelClosure.isPending}
        onConfirm={handleConfirmCancel}
      />
    </Sheet>
  );
}

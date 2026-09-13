"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { summarizeClosureFanOut } from "@/core/courts/utils/closureFanOut";
import { NewClubClosureForm } from "./components/NewClubClosureForm";
import type { NewClubClosureFormValues } from "./components/NewClubClosureForm/types";
import { ClubClosuresList } from "./components/ClubClosuresList";
import {
  useActiveCourtIds,
  useCancelClubClosure,
  useClubClosures,
  useCreateClubClosure,
} from "./hooks";

export function ClubClosuresCard() {
  const { data: activeCourtIds } = useActiveCourtIds();
  const { data: closures, isLoading: isLoadingClosures } = useClubClosures();
  const createClosure = useCreateClubClosure();
  const cancelClosure = useCancelClubClosure();
  const [closurePendingCancellation, setClosurePendingCancellation] = useState<{
    id: string;
    courtId: string;
  } | null>(null);
  const handleCancelDialogClose = useGuardedDialogClose(
    cancelClosure.isPending,
    () => setClosurePendingCancellation(null),
  );

  async function handleCreate(
    values: NewClubClosureFormValues,
  ): Promise<boolean> {
    const courtIds = activeCourtIds ?? [];
    if (courtIds.length === 0) {
      toast.error("Add at least one active court before closing the club");
      return false;
    }

    const input = {
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
      reason: values.reason,
    };

    const results = await Promise.allSettled(
      courtIds.map((courtId) => createClosure.mutateAsync({ courtId, input })),
    );
    const outcome = summarizeClosureFanOut(results);

    if (outcome.toastTone === "success") {
      toast.success(outcome.toastMessage);
    } else {
      toast.error(outcome.toastMessage);
    }

    return outcome.allSucceeded;
  }

  function handleRequestCancel(closureId: string) {
    const closure = closures?.find((c) => c.id === closureId);
    if (!closure) return;
    setClosurePendingCancellation({ id: closure.id, courtId: closure.courtId });
  }

  async function handleConfirmCancel() {
    if (!closurePendingCancellation) return;
    try {
      await cancelClosure.mutateAsync({
        courtId: closurePendingCancellation.courtId,
        closureId: closurePendingCancellation.id,
      });
      setClosurePendingCancellation(null);
    } catch {
      // useCancelClubClosure's onError already surfaces a toast; leave the
      // dialog open so the user can retry or back out explicitly.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Closures
        </h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">
          Block every court at once when the whole complex is rented out for an
          event. It lifts automatically once it ends — no need to come back and
          reopen anything.
        </p>
      </div>

      <div className="max-w-lg">
        <NewClubClosureForm
          onSubmit={handleCreate}
          isSubmitting={createClosure.isPending}
        />
      </div>

      <div className="max-w-lg">
        {isLoadingClosures || !closures ? (
          <p className="text-sm text-muted-foreground">Loading closures…</p>
        ) : (
          <ClubClosuresList
            closures={closures}
            onCancel={handleRequestCancel}
            cancellingClosureId={
              cancelClosure.isPending
                ? (cancelClosure.variables?.closureId ?? null)
                : null
            }
          />
        )}
      </div>

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
    </div>
  );
}

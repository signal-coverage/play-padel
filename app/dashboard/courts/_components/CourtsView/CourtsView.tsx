"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { CourtsTable } from "./components/CourtsTable";
import { CourtFormSheet } from "./components/CourtFormSheet";
import { AvailabilitySheet } from "./components/AvailabilitySheet";
import { ClosuresSheet } from "./components/ClosuresSheet";
import {
  useCreateCourt,
  useDeleteCourt,
  useManagedCourts,
  useUpdateCourt,
  useUploadCourtPhoto,
} from "./hooks";
import type { CourtFormValues, CourtRecord } from "./types";

export function CourtsView() {
  const { data: courts = [], isLoading } = useManagedCourts();
  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();
  const deleteCourt = useDeleteCourt();
  const uploadCourtPhoto = useUploadCourtPhoto();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<CourtRecord | null>(null);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilityCourt, setAvailabilityCourt] =
    useState<CourtRecord | null>(null);

  const [closuresOpen, setClosuresOpen] = useState(false);
  const [closuresCourt, setClosuresCourt] = useState<CourtRecord | null>(null);

  const [courtPendingDeletion, setCourtPendingDeletion] =
    useState<CourtRecord | null>(null);
  const handleDeleteDialogClose = useGuardedDialogClose(
    deleteCourt.isPending,
    () => setCourtPendingDeletion(null),
  );

  function openCreateForm() {
    setEditingCourt(null);
    setFormOpen(true);
  }

  function openEditForm(court: CourtRecord) {
    setEditingCourt(court);
    setFormOpen(true);
  }

  function openAvailability(court: CourtRecord) {
    setAvailabilityCourt(court);
    setAvailabilityOpen(true);
  }

  function openClosures(court: CourtRecord) {
    setClosuresCourt(court);
    setClosuresOpen(true);
  }

  // A photo picked while the sheet was still in create mode has nowhere to
  // upload to until the court exists — PhotoField stages that file instead
  // of uploading it, and this shared handler uploads it right after the
  // court is created. In edit mode PhotoField already uploads immediately
  // against the existing courtId, so `photoFile` is only ever set here for
  // the create path.
  async function handleFormSubmit(
    values: CourtFormValues,
    photoFile?: File | null,
  ) {
    if (editingCourt) {
      await updateCourt.mutateAsync({
        courtId: editingCourt.id,
        input: values,
      });
    } else {
      const { court } = await createCourt.mutateAsync(values);
      if (photoFile) {
        await uploadCourtPhoto.mutateAsync({
          courtId: court.id,
          file: photoFile,
        });
      }
    }
  }

  async function confirmDelete() {
    if (!courtPendingDeletion) return;
    try {
      await deleteCourt.mutateAsync(courtPendingDeletion.id);
      setCourtPendingDeletion(null);
    } catch {
      // useDeleteCourt's onError already surfaces a toast; keep the dialog
      // open so the user can retry or cancel.
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Courts
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Manage your club&apos;s courts and weekly availability.
          </p>
        </div>
        <Button type="button" onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          New court
        </Button>
      </div>

      <CourtsTable
        className="min-h-0 flex-1"
        courts={courts}
        isLoading={isLoading}
        onEdit={openEditForm}
        onEditAvailability={openAvailability}
        onEditClosures={openClosures}
        onDelete={setCourtPendingDeletion}
        deletingCourtId={
          deleteCourt.isPending ? (deleteCourt.variables ?? null) : null
        }
      />

      <CourtFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        court={editingCourt}
        onSubmit={handleFormSubmit}
        isSubmitting={
          createCourt.isPending ||
          updateCourt.isPending ||
          uploadCourtPhoto.isPending
        }
      />

      <AvailabilitySheet
        open={availabilityOpen}
        onOpenChange={setAvailabilityOpen}
        court={availabilityCourt}
      />

      <ClosuresSheet
        open={closuresOpen}
        onOpenChange={setClosuresOpen}
        court={closuresCourt}
        courts={courts}
      />

      {/*
        Uses ConfirmDialog's default GuardedActionButton confirm action
        instead of AlertDialogAction: AlertDialogAction wraps Radix's
        Dialog.Close, whose onClick unconditionally closes the dialog in the
        same synchronous click — before isPending can ever flip to true —
        which would close the dialog instantly regardless of mutation
        outcome. GuardedActionButton renders a plain Button (no Dialog.Close),
        so nothing closes the dialog on click; only the explicit
        setCourtPendingDeletion(null) in confirmDelete's success path (via
        useGuardedDialogClose's onOpenChange for Escape/overlay, or via
        ConfirmDialog's confirm button) does. variant="default" preserves
        this dialog's original (non-destructive-styled) confirm button.
      */}
      <ConfirmDialog
        open={Boolean(courtPendingDeletion)}
        onOpenChange={handleDeleteDialogClose}
        title="Deactivate court?"
        description={
          courtPendingDeletion
            ? `"${courtPendingDeletion.name}" will be marked inactive and hidden from new bookings. This can't be undone from here.`
            : undefined
        }
        confirmLabel="Deactivate"
        pendingLabel="Deactivating…"
        isPending={deleteCourt.isPending}
        onConfirm={confirmDelete}
        variant="default"
      />
    </div>
  );
}

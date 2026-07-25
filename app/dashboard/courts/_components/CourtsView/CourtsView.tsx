"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CourtsTable } from "./components/CourtsTable";
import { CourtFormSheet } from "./components/CourtFormSheet";
import { AvailabilitySheet } from "./components/AvailabilitySheet";
import {
  useCreateCourt,
  useDeleteCourt,
  useManagedCourts,
  useUpdateCourt,
} from "./hooks";
import type { CourtFormValues, CourtRecord } from "./types";

export function CourtsView() {
  const { data: courts = [], isLoading } = useManagedCourts();
  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();
  const deleteCourt = useDeleteCourt();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<CourtRecord | null>(null);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilityCourt, setAvailabilityCourt] = useState<CourtRecord | null>(
    null,
  );

  const [courtPendingDeletion, setCourtPendingDeletion] =
    useState<CourtRecord | null>(null);

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

  async function handleFormSubmit(values: CourtFormValues) {
    if (editingCourt) {
      await updateCourt.mutateAsync({ courtId: editingCourt.id, input: values });
    } else {
      await createCourt.mutateAsync(values);
    }
  }

  async function confirmDelete() {
    if (!courtPendingDeletion) return;
    await deleteCourt.mutateAsync(courtPendingDeletion.id);
    setCourtPendingDeletion(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your club&apos;s courts and weekly availability.
          </p>
        </div>
        <Button type="button" onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          New court
        </Button>
      </div>

      <CourtsTable
        courts={courts}
        isLoading={isLoading}
        onEdit={openEditForm}
        onEditAvailability={openAvailability}
        onDelete={setCourtPendingDeletion}
        deletingCourtId={deleteCourt.isPending ? deleteCourt.variables ?? null : null}
      />

      <CourtFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        court={editingCourt}
        onSubmit={handleFormSubmit}
        isSubmitting={createCourt.isPending || updateCourt.isPending}
      />

      <AvailabilitySheet
        open={availabilityOpen}
        onOpenChange={setAvailabilityOpen}
        court={availabilityCourt}
      />

      <AlertDialog
        open={Boolean(courtPendingDeletion)}
        onOpenChange={(open) => !open && setCourtPendingDeletion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate court?</AlertDialogTitle>
            <AlertDialogDescription>
              {courtPendingDeletion
                ? `"${courtPendingDeletion.name}" will be marked inactive and hidden from new bookings. This can't be undone from here.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

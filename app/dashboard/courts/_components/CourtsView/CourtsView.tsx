"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { fireSuccessCelebration } from "@/lib/utils/celebration";
import { cn } from "@/lib/utils/utils";
import { PLAN_COURT_LIMITS } from "@/lib/consts/planPricing";
import { CourtsTable } from "./components/CourtsTable";
import { CourtFormSheet } from "./components/CourtFormSheet";
import { ClosuresSheet } from "./components/ClosuresSheet";
import { BulkEditCourtsSheet } from "./components/BulkEditCourtsSheet";
import { CourtLimitReachedDialog } from "./components/CourtLimitReachedDialog";
import {
  useClubPlanInfo,
  useCreateCourt,
  useDeleteCourt,
  useManagedCourts,
  useSetCourtAvailability,
  useUpdateCourt,
  useUploadCourtPhoto,
} from "./hooks";
import type { AvailabilityEntry } from "@/core/courts/types";
import type { CourtFormValues, CourtRecord } from "./types";

export function CourtsView() {
  const { data: courts = [], isLoading } = useManagedCourts();
  const { data: clubPlanInfo } = useClubPlanInfo();
  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();
  const deleteCourt = useDeleteCourt();
  const uploadCourtPhoto = useUploadCourtPhoto();
  const setCourtAvailability = useSetCourtAvailability();
  const shouldReduceMotion = useReducedMotion();

  // Mirrors core/courts/services/courts.service.ts's createCourt exactly: a
  // per-club courtLimit override wins when set, otherwise the plan's own
  // default (PLAN_COURT_LIMITS) applies; FREE-membership clubs bypass the
  // check entirely. `null` (rather than `undefined`) means "genuinely
  // unlimited" (MAX with no override, or the query hasn't resolved yet) so
  // this never falsely gates the button while clubPlanInfo is still loading.
  const courtLimit = clubPlanInfo
    ? (clubPlanInfo.courtLimit ?? PLAN_COURT_LIMITS[clubPlanInfo.plan] ?? null)
    : null;
  const atCourtLimit =
    Boolean(clubPlanInfo) &&
    !clubPlanInfo?.isFreePlan &&
    courtLimit != null &&
    courts.length >= courtLimit;

  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<CourtRecord | null>(null);
  // Which step the merged modal opens on: the table's pencil icon opens it
  // on Details (0), the clock icon opens the SAME modal on Availability (3,
  // the last of its four steps).
  const [formStep, setFormStep] = useState<0 | 1 | 2 | 3>(0);

  const [closuresOpen, setClosuresOpen] = useState(false);
  const [closuresCourt, setClosuresCourt] = useState<CourtRecord | null>(null);

  const [courtPendingDeletion, setCourtPendingDeletion] =
    useState<CourtRecord | null>(null);
  const handleDeleteDialogClose = useGuardedDialogClose(
    deleteCourt.isPending,
    () => setCourtPendingDeletion(null),
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  function toggleSelect(courtId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(courtId)) next.delete(courtId);
      else next.add(courtId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === courts.length
        ? new Set()
        : new Set(courts.map((c) => c.id)),
    );
  }

  function openCreateForm() {
    setEditingCourt(null);
    setFormStep(0);
    setFormOpen(true);
  }

  // The button itself is never HTML-`disabled` at the limit — only styled to
  // look it (see its className below) — so this click handler is the real
  // gate: it opens the explanatory dialog instead of the create form.
  function handleNewCourtClick() {
    if (atCourtLimit) {
      setLimitDialogOpen(true);
      return;
    }
    openCreateForm();
  }

  function openEditForm(court: CourtRecord) {
    setEditingCourt(court);
    setFormStep(0);
    setFormOpen(true);
  }

  function openAvailability(court: CourtRecord) {
    setEditingCourt(court);
    setFormStep(3);
    setFormOpen(true);
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
  // the create path. `availability` is always sent now — the merged sheet
  // saves the court's details and its weekly schedule as one single action,
  // regardless of which of the two steps was showing when the owner clicked
  // submit.
  async function handleFormSubmit(
    values: CourtFormValues,
    photoFile: File | null | undefined,
    availability: AvailabilityEntry[],
  ) {
    if (editingCourt) {
      await updateCourt.mutateAsync({
        courtId: editingCourt.id,
        input: values,
      });
      await setCourtAvailability.mutateAsync({
        courtId: editingCourt.id,
        entries: availability,
      });
    } else {
      const { court } = await createCourt.mutateAsync({
        ...values,
        availability,
      });
      if (photoFile) {
        try {
          await uploadCourtPhoto.mutateAsync({
            courtId: court.id,
            file: photoFile,
          });
        } catch (uploadError) {
          // The court was already created, but its photo never made it —
          // per the "only create the court when everything is OK"
          // requirement, roll that back instead of leaving a photo-less
          // orphan behind. Best-effort and silent: a rollback failure here
          // must not mask the real (upload) error, same swallowing pattern
          // as the reservation-rollback-on-checkout-failure code in
          // app/api/player/reservations/route.ts.
          try {
            await deleteCourt.mutateAsync({ courtId: court.id, silent: true });
          } catch {
            // Best-effort rollback; the upload error below still applies.
          }
          toast.error(
            uploadError instanceof Error
              ? uploadError.message
              : "Could not upload the court photo. Please try again.",
          );
          throw uploadError;
        }
      }
      // Fired here, after the whole create-or-create+photo operation
      // resolves, rather than from useCreateCourt's own onSuccess — that
      // fires the instant the create POST lands, before the chained photo
      // upload above even starts, which would show the success toast/
      // celebration while the Sheet (see CourtFormSheet's submit) is still
      // "Saving…" the photo.
      toast.success("Court created");
      if (!shouldReduceMotion) {
        fireSuccessCelebration();
      }
    }
  }

  async function confirmDelete() {
    if (!courtPendingDeletion) return;
    try {
      await deleteCourt.mutateAsync({ courtId: courtPendingDeletion.id });
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
        <Button
          type="button"
          onClick={handleNewCourtClick}
          className={cn(atCourtLimit && "cursor-not-allowed opacity-50")}
        >
          <Plus className="h-4 w-4" />
          New court
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-sm border bg-muted/30 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} court(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkEditOpen(true)}
            >
              Bulk edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <CourtsTable
        // Same fix as PlayersDirectory's table
        // (app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx)
        // — see its own comments for the full explanation. <main>
        // (DashboardShell.tsx) is overflow-y-auto (whole-page scroll) below
        // md, not md:overflow-hidden, so the h-full/flex-1 chain this table
        // normally stretches against collapses there; min-h-[60svh] doesn't
        // depend on that chain, md:min-h-0 restores the exact previous
        // desktop sizing.
        className="min-h-[60svh] flex-1 md:min-h-0"
        courts={courts}
        isLoading={isLoading}
        onEdit={openEditForm}
        onEditAvailability={openAvailability}
        onEditClosures={openClosures}
        onDelete={setCourtPendingDeletion}
        deletingCourtId={
          deleteCourt.isPending
            ? (deleteCourt.variables?.courtId ?? null)
            : null
        }
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
      />

      {/* Real spacer box (height, not margin/padding), mobile only — see
          PlayersDirectory.tsx's identical spacer for the full explanation
          of why margin/padding on the table itself doesn't work here. The
          Sheets/Dialogs below render into a portal, so they don't affect
          this column's normal layout flow. */}
      <div className="h-8 shrink-0 md:hidden" aria-hidden="true" />

      <CourtFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        court={editingCourt}
        onSubmit={handleFormSubmit}
        initialStep={formStep}
        isSubmitting={
          createCourt.isPending ||
          updateCourt.isPending ||
          uploadCourtPhoto.isPending ||
          setCourtAvailability.isPending
        }
      />

      <ClosuresSheet
        open={closuresOpen}
        onOpenChange={setClosuresOpen}
        court={closuresCourt}
        courts={courts}
      />

      <BulkEditCourtsSheet
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        courtIds={Array.from(selectedIds)}
        courtCount={selectedIds.size}
        onSuccess={() => setSelectedIds(new Set())}
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

      {clubPlanInfo && courtLimit != null && (
        <CourtLimitReachedDialog
          open={limitDialogOpen}
          onOpenChange={setLimitDialogOpen}
          plan={clubPlanInfo.plan}
          limit={courtLimit}
        />
      )}
    </div>
  );
}

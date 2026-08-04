"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CourtAvailabilityGrid } from "@/components/CourtAvailabilityGrid";
import type { Slot } from "@/components/CourtAvailabilityGrid";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { ClubPicker } from "./components/ClubPicker";
import { BookingConfirmDialog } from "./components/BookingConfirmDialog";
import { useActiveClubs, useClubAvailability, useBookSlot } from "./hooks";
import type { SelectedSlot } from "./types";

export function BrowseCourts() {
  const [clubId, setClubId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date());
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  const { data: clubs, isLoading: clubsLoading } = useActiveClubs();
  const {
    data: courts,
    isLoading: availabilityLoading,
    isUpdating: availabilityUpdating,
    isError: availabilityError,
    columnCount,
    rowCount,
  } = useClubAvailability(clubId, date);
  const bookSlot = useBookSlot();
  const handleDialogClose = useGuardedDialogClose(bookSlot.isPending, () =>
    setSelected(null),
  );

  function handleSlotClick(courtId: string, slot: Slot) {
    if (slot.status !== "free") return;
    const court = courts?.find((c) => c.id === courtId);
    if (!court) return;
    setSelected({ courtId, courtName: court.name, slot });
  }

  async function handleConfirm() {
    if (!selected) return;
    try {
      await bookSlot.mutateAsync({
        courtId: selected.courtId,
        scheduledStart: selected.slot.start.toISOString(),
        scheduledEnd: selected.slot.end.toISOString(),
      });
      toast.success("Reservation confirmed.");
      setSelected(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not book this slot.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Browse Courts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a club and reserve a free slot.
        </p>
      </div>

      <ClubPicker
        clubs={clubs ?? []}
        value={clubId}
        onChange={setClubId}
        isLoading={clubsLoading}
      />

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {clubId ? (
          <CourtAvailabilityGrid
            date={date}
            courts={courts ?? []}
            variant="player"
            onSlotClick={handleSlotClick}
            onDateChange={setDate}
            isLoading={availabilityLoading}
            isUpdating={availabilityUpdating}
            isError={availabilityError}
            columnCount={columnCount}
            rowCount={rowCount}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a club to see court availability.
          </p>
        )}
      </div>

      <BookingConfirmDialog
        open={!!selected}
        onOpenChange={handleDialogClose}
        courtName={selected?.courtName ?? ""}
        slot={selected?.slot ?? null}
        isSubmitting={bookSlot.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

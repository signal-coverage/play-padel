"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCourtAvailability, useSetCourtAvailability } from "../../hooks";
import { availabilityRowsToEntries } from "../../utils";
import { AvailabilityRowsEditor } from "./components/AvailabilityRowsEditor";
import type { AvailabilityDayRow } from "../../types";
import type { AvailabilitySheetProps } from "./types";

export function AvailabilitySheet({
  open,
  onOpenChange,
  court,
}: AvailabilitySheetProps) {
  const courtId = court?.id ?? null;
  const { data: availability, isLoading } = useCourtAvailability(
    open ? courtId : null,
  );
  const setAvailability = useSetCourtAvailability();

  async function handleSave(rows: AvailabilityDayRow[]) {
    if (!courtId) return;
    await setAvailability.mutateAsync({
      courtId,
      entries: availabilityRowsToEntries(rows),
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Weekly availability</SheetTitle>
          <SheetDescription>
            {court
              ? `Set the recurring weekly schedule for ${court.name}.`
              : "Set the recurring weekly schedule."}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !availability ? (
          <div className="flex-1 px-4">
            <p className="text-sm text-muted-foreground">Loading schedule…</p>
          </div>
        ) : (
          <AvailabilityRowsEditor
            // Remounts (fresh local draft) whenever a different court's data
            // loads, instead of resetting the draft via an effect.
            key={courtId}
            initialAvailability={availability}
            onSave={handleSave}
            isSaving={setAvailability.isPending}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

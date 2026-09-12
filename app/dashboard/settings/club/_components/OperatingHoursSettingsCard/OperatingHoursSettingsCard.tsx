"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AvailabilityRowsEditor,
  type AvailabilityDayRow,
} from "@/components/AvailabilityRowsEditor";
import { availabilityRowsToEntries, buildAvailabilityRows } from "./utils";
import { useClubOperatingHours, useSetClubOperatingHours } from "./hooks";

export function OperatingHoursSettingsCard() {
  const { data: operatingHours, isLoading } = useClubOperatingHours();
  const setOperatingHours = useSetClubOperatingHours();

  const [rows, setRows] = useState<AvailabilityDayRow[]>(() =>
    buildAvailabilityRows([]),
  );

  // Seeds the editor once the club's saved operating hours arrive.
  // Adjusted during render (comparing against a plain state value, not a
  // ref) rather than in a `useEffect` — same pattern CourtFormSheet.tsx
  // already uses for this exact "seed once data arrives" need, since this
  // repo's lint config is stricter than typical Next.js defaults about both
  // `react-hooks/set-state-in-effect` and reading/writing refs during render.
  const [seeded, setSeeded] = useState(false);
  if (operatingHours && !seeded) {
    setRows(buildAvailabilityRows(operatingHours));
    setSeeded(true);
  }

  // Only a same start/end time is invalid — an active day whose end time is
  // numerically before its start time (e.g. 21:00-02:00) means the club
  // closes after midnight, which is a valid overnight window. Same rule
  // CourtFormSheet.tsx already establishes for its own availability step.
  const isAvailabilityValid = rows.every(
    (row) => !row.active || row.endTime !== row.startTime,
  );

  async function handleSave() {
    await setOperatingHours.mutateAsync(availabilityRowsToEntries(rows));
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-lg">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Schedule
        </h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">
          Set the days and hours your club is open for players to book. New
          courts default to these hours.
        </p>
      </div>

      <div className="max-w-5xl">
        <AvailabilityRowsEditor rows={rows} onChange={setRows} layout="split" />
      </div>

      <div>
        <Button
          onClick={handleSave}
          disabled={setOperatingHours.isPending || !isAvailabilityValid}
        >
          {setOperatingHours.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

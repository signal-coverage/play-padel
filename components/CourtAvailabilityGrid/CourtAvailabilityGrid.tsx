"use client";

import { Loader2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/utils";

import { DayNavigator } from "./components/DayNavigator";
import { GridEmptyState } from "./components/GridEmptyState";
import { GridErrorState } from "./components/GridErrorState";
import { GridLoadingState } from "./components/GridLoadingState";
import { SlotCell } from "./components/SlotCell";
import { gridScrollContainerClassName, timeLabelCellClassName } from "./styles";
import type { CourtAvailabilityGridProps } from "./types";
import { buildTimeRows, formatSlotTime } from "./utils";

export function CourtAvailabilityGrid({
  date,
  courts,
  variant,
  onSlotClick,
  onDateChange,
  isLoading = false,
  isUpdating = false,
  isError = false,
  columnCount,
  rowCount,
}: CourtAvailabilityGridProps) {
  const timeRows = buildTimeRows(courts);
  const hasCourts = courts.length > 0;
  // Only meaningful once we're past the full-skeleton loading state — a
  // fresh load/club switch already communicates "not ready" via
  // `GridLoadingState`, so there's nothing extra to signal here.
  const showsStaleData = isUpdating && !isLoading;

  // Single persistent live region: stays mounted across loading/loaded/empty
  // and only its text changes, instead of a status element that
  // mounts/unmounts with the state itself (screen readers don't reliably
  // announce a `role="status"` node that appears after the fact).
  const statusMessage = isLoading
    ? "Loading court availability…"
    : isError
      ? "Couldn't load court availability."
      : showsStaleData
        ? "Updating court availability for the new day…"
        : !hasCourts
          ? "No courts to show for this day."
          : "Court availability loaded.";

  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        {statusMessage}
      </span>
      <div className="flex flex-col gap-1.5">
        <DayNavigator date={date} onDateChange={onDateChange} />
        {showsStaleData && (
          <div
            className="flex items-center gap-1.5 self-end text-xs text-muted-foreground"
            aria-hidden="true"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </div>
        )}
      </div>

      {isLoading ? (
        <GridLoadingState
          columnCount={columnCount ?? courts.length}
          rowCount={rowCount}
        />
      ) : isError ? (
        <GridErrorState />
      ) : !hasCourts ? (
        <GridEmptyState />
      ) : (
        <div
          className={cn(
            gridScrollContainerClassName,
            // Slots keep rendering (this is a background refetch, not a
            // full reload) but are visually de-emphasized and — via the
            // omitted `onSlotClick` below — no longer clickable, so a click
            // landing mid-refetch can't book against the stale date.
            showsStaleData && "opacity-60 transition-opacity",
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className={timeLabelCellClassName}>
                  Time
                </TableHead>
                {courts.map((court) => (
                  <TableHead
                    key={court.id}
                    scope="col"
                    className="min-w-28 max-w-40 truncate text-center"
                    title={court.name}
                  >
                    {court.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={courts.length + 1}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No time slots available for this day.
                  </TableCell>
                </TableRow>
              )}

              {timeRows.map((row) => (
                <TableRow key={row.key}>
                  <TableHead scope="row" className={timeLabelCellClassName}>
                    {formatSlotTime(row.time)}
                  </TableHead>
                  {courts.map((court) => (
                    <TableCell key={court.id} className="p-1.5">
                      <SlotCell
                        slot={row.slotsByCourtId.get(court.id)}
                        courtId={court.id}
                        courtName={court.name}
                        variant={variant}
                        // Omitting the handler (rather than passing it and
                        // guarding inside) reuses `isSlotInteractive`'s
                        // existing `hasClickHandler` check to render plain,
                        // non-interactive cells while stale data is shown —
                        // no new prop needed on SlotCell.
                        onSlotClick={showsStaleData ? undefined : onSlotClick}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DayNavigator } from "./components/DayNavigator";
import { GridEmptyState } from "./components/GridEmptyState";
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
}: CourtAvailabilityGridProps) {
  const timeRows = buildTimeRows(courts);
  const hasCourts = courts.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <DayNavigator date={date} onDateChange={onDateChange} />

      {isLoading ? (
        <GridLoadingState columnCount={courts.length} />
      ) : !hasCourts ? (
        <GridEmptyState />
      ) : (
        <div className={gridScrollContainerClassName}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={timeLabelCellClassName}>Time</TableHead>
                {courts.map((court) => (
                  <TableHead key={court.id} className="min-w-28 text-center">
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
                  <TableCell className={timeLabelCellClassName}>
                    {formatSlotTime(row.time)}
                  </TableCell>
                  {courts.map((court) => (
                    <TableCell key={court.id} className="p-1.5">
                      <SlotCell
                        slot={row.slotsByCourtId.get(court.id)}
                        courtId={court.id}
                        variant={variant}
                        onSlotClick={onSlotClick}
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

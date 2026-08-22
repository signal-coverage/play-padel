"use client";

import { CourtAvailabilityGrid } from "@/components/CourtAvailabilityGrid";
import { StatusBox } from "@/components/StatusBox";
import type { CourtSchedulePanelProps } from "./types";

export function CourtSchedulePanel({
  date,
  onDateChange,
  selectedCourt,
  onSlotClick,
  onJoinWaitlist,
  isLoading,
  isUpdating,
  isError,
  rowCount,
}: CourtSchedulePanelProps) {
  // Check `isLoading` before `selectedCourt`: on a shared `?court=` URL the
  // court list is still being fetched (so `selectedCourt` is briefly null)
  // and the panel must show the grid's own loading skeleton, not this
  // "select a court" message — which is only correct once loading has
  // actually finished and there's still no court selected. This replaces
  // only the table area below, not the whole panel — the spacer row above
  // stays in place so this column doesn't collapse to a bare placeholder
  // box while its siblings keep their own header row.
  const showEmptyMessage = !isLoading && !selectedCourt;

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Invisible copy of ClubCourtsPanel's "Sort by" label + h-8 control
          row (same text-xs/gap-1.5/h-8 tokens, same gap-2 below), so this
          column reserves the identical height above its table without
          hardcoding a pixel value. The `-mt-3` below cancels the one part
          of the offset that isn't ours to match by recipe: the 12px
          CourtAvailabilityGrid already reserves internally above its own
          table (its lone real flex gap, since the sr-only status span is
          `absolute` and doesn't consume one). */}
      <div
        className="invisible hidden flex-col gap-1.5 lg:flex"
        aria-hidden="true"
      >
        <span className="text-xs font-medium">Sort by</span>
        <div className="h-8" />
      </div>
      {showEmptyMessage ? (
        <StatusBox className="flex min-h-0 flex-1 flex-col items-center justify-center">
          Select a court to see its schedule.
        </StatusBox>
      ) : (
        <div className="min-h-0 flex-1 lg:-mt-3">
          <CourtAvailabilityGrid
            date={date}
            courts={selectedCourt ? [selectedCourt] : []}
            variant="player"
            onSlotClick={onSlotClick}
            onJoinWaitlist={onJoinWaitlist}
            onDateChange={onDateChange}
            isLoading={isLoading}
            isUpdating={isUpdating}
            isError={isError}
            columnCount={1}
            rowCount={rowCount}
            hideDayNavigator
          />
        </div>
      )}
    </div>
  );
}

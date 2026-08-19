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
  // actually finished and there's still no court selected.
  if (!isLoading && !selectedCourt) {
    return (
      <StatusBox className="flex h-full flex-col items-center justify-center">
        Select a court to see its schedule.
      </StatusBox>
    );
  }

  return (
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
  );
}

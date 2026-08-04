import { Skeleton } from "@/components/ui/skeleton";

import {
  DEFAULT_LOADING_SKELETON_COLUMN_COUNT,
  LOADING_SKELETON_ROW_COUNT,
} from "./consts";
import type { GridLoadingStateProps } from "./types";

export function GridLoadingState({
  columnCount = DEFAULT_LOADING_SKELETON_COLUMN_COUNT,
  rowCount = LOADING_SKELETON_ROW_COUNT,
}: GridLoadingStateProps) {
  const rows = Array.from({ length: rowCount || LOADING_SKELETON_ROW_COUNT });
  const columns = Array.from({
    length: columnCount || DEFAULT_LOADING_SKELETON_COLUMN_COUNT,
  });

  return (
    // Purely decorative — the accessible loading announcement lives in a
    // single persistent `role="status"` region in CourtAvailabilityGrid that
    // stays mounted across loading/loaded/empty, instead of this element
    // (which mounts/unmounts with `isLoading`) firing its own.
    <div
      aria-hidden="true"
      className="flex flex-col gap-2 rounded-lg border p-2"
    >
      {rows.map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 shrink-0" />
          {columns.map((_, columnIndex) => (
            <Skeleton key={columnIndex} className="h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

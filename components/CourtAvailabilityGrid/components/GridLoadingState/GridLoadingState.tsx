import { Skeleton } from "@/components/ui/skeleton";

import {
  DEFAULT_LOADING_SKELETON_COLUMN_COUNT,
  LOADING_SKELETON_ROW_COUNT,
} from "./consts";
import type { GridLoadingStateProps } from "./types";

export function GridLoadingState({
  columnCount = DEFAULT_LOADING_SKELETON_COLUMN_COUNT,
}: GridLoadingStateProps) {
  const rows = Array.from({ length: LOADING_SKELETON_ROW_COUNT });
  const columns = Array.from({
    length: columnCount || DEFAULT_LOADING_SKELETON_COLUMN_COUNT,
  });

  return (
    <div
      role="status"
      aria-label="Loading court availability"
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

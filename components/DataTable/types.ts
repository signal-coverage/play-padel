import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Custom loading-state placeholder for this column (e.g. a differently-sized or pill-shaped Skeleton). Falls back to a generic `h-4 w-20` Skeleton when omitted. */
  loadingCell?: ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading: boolean;
  loadingLabel: string;
  loadingRowCount?: number;
  emptyState: ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
  isRowSelected?: (row: T) => boolean;
};

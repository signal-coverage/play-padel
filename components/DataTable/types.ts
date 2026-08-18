import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
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

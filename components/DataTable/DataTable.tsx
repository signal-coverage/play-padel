"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/utils";
import type { DataTableProps } from "./types";

const DEFAULT_LOADING_ROW_COUNT = 5;
const EDGE_FADE_WIDTH_PX = 24;
const EDGE_COLUMN_PADDING_CLASSNAME =
  "[&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4";

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  loadingLabel,
  loadingRowCount = DEFAULT_LOADING_ROW_COUNT,
  emptyState,
  className,
  onRowClick,
  isRowSelected,
}: DataTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [scrollbarGutter, setScrollbarGutter] = useState({
    right: 0,
    bottom: 0,
  });

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 0);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    setScrollbarGutter({
      right: el.offsetWidth - el.clientWidth,
      bottom: el.offsetHeight - el.clientHeight,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFades();
    const observer = new ResizeObserver(updateFades);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateFades, columns, rows]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col overflow-hidden rounded-sm border",
          className,
        )}
      >
        <span className="sr-only" role="status">
          {loadingLabel}
        </span>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          <Table aria-hidden="true" className={EDGE_COLUMN_PADDING_CLASSNAME}>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(column.className, column.headerClassName)}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingRowCount }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.loadingCell ?? <Skeleton className="h-4 w-20" />}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-sm border",
        className,
      )}
    >
      <div
        ref={scrollRef}
        onScroll={updateFades}
        className="min-h-0 min-w-0 flex-1 overflow-auto"
      >
        <Table className={EDGE_COLUMN_PADDING_CLASSNAME}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(column.className, column.headerClassName)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={rowKey(row)}
                data-state={isRowSelected?.(row) ? "selected" : undefined}
                {...(onRowClick && {
                  role: "button",
                  tabIndex: 0,
                  onClick: () => onRowClick(row),
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    onRowClick(row);
                  },
                  className:
                    "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                })}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 bg-linear-to-r from-background to-transparent transition-opacity duration-150"
        style={{
          width: EDGE_FADE_WIDTH_PX,
          bottom: scrollbarGutter.bottom,
          opacity: showLeftFade ? 1 : 0,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 bg-linear-to-l from-background to-transparent transition-opacity duration-150"
        style={{
          width: EDGE_FADE_WIDTH_PX,
          right: scrollbarGutter.right,
          bottom: scrollbarGutter.bottom,
          opacity: showRightFade ? 1 : 0,
        }}
      />
    </div>
  );
}

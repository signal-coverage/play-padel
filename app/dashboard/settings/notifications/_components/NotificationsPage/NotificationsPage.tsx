"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listNotifications } from "@/app/actions/notifications";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  NotificationType,
  NotificationStatus,
} from "@/core/notifications/types";
import type { NotificationsPageProps, NotificationFiltersState } from "./types";
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_STATUS_LABELS,
} from "@/core/notifications/consts";
import {
  NOTIFICATION_STATUS_COLORS,
  PAGE_SIZE,
  TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from "./consts";

export function NotificationsPage({}: NotificationsPageProps) {
  const [filters, setFilters] = useState<NotificationFiltersState>({
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const { data, isFetching } = useQuery({
    queryKey: ["notifications", filters],
    queryFn: () =>
      listNotifications(
        { type: filters.type, status: filters.status },
        filters.page,
        filters.pageSize,
      ),
    placeholderData: (prev) => prev,
  });

  const notifications = data?.success ? data.data.notifications : [];
  const total = data?.success ? data.data.total : 0;
  const error = !data?.success && data !== undefined ? data.error : null;

  const totalPages = Math.ceil(total / filters.pageSize);

  function handleTypeChange(type: NotificationType | "") {
    setFilters((f) => ({ ...f, type: type || undefined, page: 1 }));
  }

  function handleStatusChange(status: NotificationStatus | "") {
    setFilters((f) => ({ ...f, status: status || undefined, page: 1 }));
  }

  function handlePageChange(page: number) {
    setFilters((f) => ({ ...f, page }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Notification Log</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only log of all outgoing notifications.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={filters.type ?? "__all__"}
          onValueChange={(v) =>
            handleTypeChange(v === "__all__" ? "" : (v as NotificationType))
          }
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? "__all__"}
          onValueChange={(v) =>
            handleStatusChange(v === "__all__" ? "" : (v as NotificationStatus))
          }
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-red-600">Failed to load notifications.</p>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Recipient</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Sent At</th>
              <th className="text-left px-4 py-3 font-medium">
                Failure Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {isFetching ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                </tr>
              ))
            ) : notifications.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No notifications found.
                </td>
              </tr>
            ) : (
              notifications.map((n) => (
                <tr key={n.id} className="border-t">
                  <td className="px-4 py-3">
                    {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {n.recipientEmail}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${NOTIFICATION_STATUS_COLORS[n.status]}`}
                  >
                    {NOTIFICATION_STATUS_LABELS[n.status]}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {n.sentAt ? new Date(n.sentAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {n.failureReason ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} notifications — page {filters.page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => handlePageChange(filters.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages}
              onClick={() => handlePageChange(filters.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import type {
  NotificationStatus,
  NotificationType,
} from "@/core/notifications/types";
import {
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
} from "@/core/notifications/consts";

export const NOTIFICATION_STATUS_COLORS: Record<NotificationStatus, string> = {
  PENDING: "text-yellow-600",
  SENT: "text-green-600",
  FAILED: "text-red-600",
};

export const PAGE_SIZE = 20;

export const TYPE_FILTER_OPTIONS: { value: NotificationType | "__all__"; label: string }[] = [
  { value: "__all__", label: "All types" },
  ...(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map(
    (type) => ({ value: type, label: NOTIFICATION_TYPE_LABELS[type] }),
  ),
];

export const STATUS_FILTER_OPTIONS: {
  value: NotificationStatus | "__all__";
  label: string;
}[] = [
  { value: "__all__", label: "All statuses" },
  ...(Object.keys(NOTIFICATION_STATUS_LABELS) as NotificationStatus[]).map(
    (status) => ({ value: status, label: NOTIFICATION_STATUS_LABELS[status] }),
  ),
];

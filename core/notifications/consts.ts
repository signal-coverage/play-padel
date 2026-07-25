import type {
  NotificationType,
  NotificationStatus,
} from "@/core/notifications/types";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  RESERVATION_REMINDER: "Reservation Reminder",
  RESERVATION_CANCELLED: "Reservation Cancelled",
  PAYMENT_CONFIRMED: "Payment Confirmed",
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: "Pending",
  SENT: "Sent",
  FAILED: "Failed",
};

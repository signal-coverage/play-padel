export type NotificationType =
  | "RESERVATION_REMINDER"
  | "RESERVATION_CANCELLED"
  | "PAYMENT_CONFIRMED"
  | "WAITLIST_SLOT_AVAILABLE"
  | "CLUB_APPROVED"
  | "CLUB_REJECTED"
  | "CLUB_SUSPENDED"
  | "PAYMENT_RECEIVED"
  | "MEMBERSHIP_PAST_DUE"
  | "CLUB_PENDING_APPROVAL"
  | "SYSTEM_JOB_FAILED"
  | "RESERVATION_PAYMENT_CONFLICT"
  | "CLUB_OPERATIONAL_READY"
  | "ADMIN_ACCESS_GRANTED"
  | "ADMIN_ACCESS_REVOKED"
  | "MEMBERSHIP_CANCELLED"
  | "RESERVATION_UPDATED"
  | "PROFILE_UPDATED_BY_ADMIN"
  | "CLUB_UPDATED_BY_ADMIN"
  | "RESERVATION_PAYMENT_HOLD_EXPIRED";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export interface Notification {
  id: string;
  clubId: string | null;
  type: NotificationType;
  recipientId: string;
  recipientEmail: string;
  title: string;
  message: string;
  status: NotificationStatus;
  failureReason?: string;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface DispatchParams {
  type: NotificationType;
  clubId: string | null;
  recipientId: string;
  recipientEmail: string | null | undefined;
  recipientName: string;
  subject: string;
  html: string;
  // Default true. When false, dispatch() skips Resend entirely and marks the
  // row SKIPPED instead of attempting delivery (in-app-only notification).
  sendEmail?: boolean;
}

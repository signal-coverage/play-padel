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
  // The owning club's URL-safe slug (see prisma/schema.prisma's Club.slug
  // doc comment) — resolved via a batch lookup at list time (see
  // listRecipientNotifications), never persisted on the row itself. Null
  // whenever clubId is null, or (rarely) if the club has since been
  // deleted. This, never clubId, is what a notification's own deep-link
  // href is built from (see NotificationsBell/utils.ts's getNotificationHref).
  clubSlug: string | null;
  type: NotificationType;
  recipientId: string;
  recipientEmail: string;
  title: string;
  message: string;
  // The raw params title/message were resolved from (see
  // prisma/schema.prisma's Notification.params doc comment) — lets
  // listNotifications/listRecipientNotifications re-render title/message
  // live in the current VIEWER's locale, instead of staying frozen in
  // whichever language the recipient's preference happened to be at
  // dispatch time. Null for any row that predates this column, or was
  // dispatched with no params at all — those keep showing their originally
  // baked title/message as-is.
  params?: Record<string, string | number> | null;
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
  // Replaces the old subject/html pair — dispatch() resolves the actual
  // subject/html text itself, in the RECIPIENT's own locale, via
  // lib/notifications/content.ts's resolveNotificationContent(type, locale,
  // params). `params` carries whatever dynamic values that NotificationType's
  // message template needs (a club name, a reservation date, an amount, a
  // "variant" key selecting between multiple real-world messages that share
  // one NotificationType, etc.) — see content.ts for the full per-type shape.
  params: Record<string, string | number>;
  // Default true. When false, dispatch() skips Resend entirely and marks the
  // row SKIPPED instead of attempting delivery (in-app-only notification).
  sendEmail?: boolean;
}

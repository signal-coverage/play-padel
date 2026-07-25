export type NotificationType =
  | "RESERVATION_REMINDER"
  | "RESERVATION_CANCELLED"
  | "PAYMENT_CONFIRMED";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export interface Notification {
  id: string;
  clubId: string;
  type: NotificationType;
  recipientId: string;
  recipientEmail: string;
  title: string;
  message: string;
  status: NotificationStatus;
  failureReason?: string;
  sentAt?: Date;
  createdAt: Date;
}

export interface DispatchParams {
  type: NotificationType;
  clubId: string;
  recipientId: string;
  recipientEmail: string | null | undefined;
  recipientName: string;
  subject: string;
  html: string;
}

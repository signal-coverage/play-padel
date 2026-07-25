export type NotificationType =
  | "APPOINTMENT_REMINDER"
  | "APPOINTMENT_CANCELLED"
  | "INVOICE_PAID"
  | "PATIENT_BIRTHDAY";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export interface Notification {
  id: string;
  organizationId: string;
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
  organizationId: string;
  recipientId: string;
  recipientEmail: string | null | undefined;
  recipientName: string;
  subject: string;
  html: string;
}

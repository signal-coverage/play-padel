export type AuditAction =
  | "reservation.created"
  | "reservation.cancelled"
  | "reservation.completed"
  | "reservation.no_show"
  | "court.created"
  | "court.updated"
  | "court.deactivated"
  | "court.closure_created"
  | "court.closure_cancelled"
  | "club.created"
  | "club.updated"
  | "user.created"
  | "user.updated"
  | "user.anonymized"
  | "payment.confirmed"
  | "payment.refunded"
  | "waitlist.notified";

export interface AuditLog {
  id: string;
  clubId: string | null;
  userId: string;
  userDisplayName: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  timestamp: Date;
}

export interface AuditFilters {
  entity?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

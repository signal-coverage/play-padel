export type AuditAction =
  | "patient.created"
  | "patient.updated"
  | "patient.deleted"
  | "appointment.created"
  | "appointment.updated"
  | "appointment.cancelled"
  | "appointment.completed"
  | "appointment.no_show"
  | "invoice.created"
  | "invoice.issued"
  | "invoice.voided"
  | "invoice.paid"
  | "professional.created"
  | "professional.updated"
  | "professional.deactivated"
  | "user.invited"
  | "user.updated"
  | "user.deleted"
  | "organization.updated"
  | "organization.plan_changed"
  | "plugin.installed"
  | "plugin.uninstalled";

export interface AuditLog {
  id: string;
  organizationId: string;
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

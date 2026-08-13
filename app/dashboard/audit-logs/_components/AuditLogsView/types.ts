export type RawAuditLogRecord = {
  id: string;
  clubId: string | null;
  userId: string;
  userDisplayName: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
};

export type AuditLogRecord = Omit<RawAuditLogRecord, "timestamp"> & {
  timestamp: Date;
};

export type AuditLogFiltersState = {
  entity?: string;
  action?: string;
  page: number;
};

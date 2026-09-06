// Minimal mirror of core/systemJobs/types's SystemJobLogRecord (same wire
// shape, from app/api/admin/system-status/route.ts) — kept as an independent
// local copy per this repo's SRP-per-folder convention (see
// AuditLogsView/types.ts's RawAuditLogRecord/AuditLogRecord split for the
// same raw-string-dates -> parsed-Dates pattern).
export type RawSystemJobLogRecord = {
  id: string;
  kind: "CRON" | "WEBHOOK";
  name: string;
  status: "SUCCESS" | "FAILURE";
  startedAt: string;
  finishedAt: string;
  errorMessage: string | null;
  createdAt: string;
};

export type SystemJobLogRecord = Omit<
  RawSystemJobLogRecord,
  "startedAt" | "finishedAt" | "createdAt"
> & {
  startedAt: Date;
  finishedAt: Date;
  createdAt: Date;
};

export type RawSystemStatusSummary = Record<
  string,
  RawSystemJobLogRecord | null
>;

export type SystemStatusSummary = Record<string, SystemJobLogRecord | null>;

export type SystemStatusData = {
  summary: SystemStatusSummary;
  recent: SystemJobLogRecord[];
};

export type RawSystemStatusResponse = {
  summary: RawSystemStatusSummary;
  recent: RawSystemJobLogRecord[];
};

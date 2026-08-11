import type { AuditLogRecord } from "../../types";

export type AuditLogsTableProps = {
  logs: AuditLogRecord[];
  isLoading: boolean;
};

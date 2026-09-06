// Same "MMM d, HH:mm" shape AuditLogsTable already uses for its "When"
// column (see AuditLogsView/components/AuditLogsTable/AuditLogsTable.tsx) —
// this includes the year too since search results can span far outside the
// current one.
export const SCHEDULED_START_FORMAT = "MMM d, yyyy HH:mm";

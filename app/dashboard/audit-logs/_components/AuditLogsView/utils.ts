import type { AuditAction } from "@/core/audit/types";
import { AUDIT_ACTION_LABELS } from "./consts";
import type { AuditLogRecord, RawAuditLogRecord } from "./types";

export function toAuditLogRecord(raw: RawAuditLogRecord): AuditLogRecord {
  return { ...raw, timestamp: new Date(raw.timestamp) };
}

/** Falls back to the raw action string for any value outside the known
 * AuditAction union — the DB column is a plain string, not an enum, so this
 * stays resilient to a stray/legacy value rather than throwing. */
export function getActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditAction] ?? action;
}

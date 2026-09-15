import { AUDIT_ACTION_VALUES } from "./consts";
import type { AuditLogRecord, RawAuditLogRecord } from "./types";

export function toAuditLogRecord(raw: RawAuditLogRecord): AuditLogRecord {
  return { ...raw, timestamp: new Date(raw.timestamp) };
}

/** Resolves an AuditAction (e.g. "reservation.created") against the
 * "AuditActionLabels" next-intl namespace, whose messages/*.json shape
 * mirrors that dotted path exactly (reservation: { created: "..." }, etc.) —
 * `t` is the caller's own useTranslations('AuditActionLabels') result, since
 * this plain util can't call useTranslations() itself (see
 * CourtsView/utils.ts's surfaceLabel for the same pattern). Falls back to
 * the raw action string for any value outside the known AuditAction union —
 * the DB column is a plain string, not an enum, so this stays resilient to a
 * stray/legacy value rather than a broken "missing message" fallback. */
export function getActionLabel(
  action: string,
  t: (key: string) => string,
): string {
  const isKnownAction = (AUDIT_ACTION_VALUES as readonly string[]).includes(
    action,
  );
  return isKnownAction ? t(action) : action;
}

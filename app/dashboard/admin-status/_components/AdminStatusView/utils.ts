import { SYSTEM_JOB_NAMES } from "./consts";
import type {
  RawSystemJobLogRecord,
  RawSystemStatusResponse,
  SystemJobLogRecord,
  SystemStatusData,
} from "./types";

export function toSystemJobLogRecord(
  raw: RawSystemJobLogRecord,
): SystemJobLogRecord {
  return {
    ...raw,
    startedAt: new Date(raw.startedAt),
    finishedAt: new Date(raw.finishedAt),
    createdAt: new Date(raw.createdAt),
  };
}

/** Resolves a job name (e.g. "membership-grace-sweep") against the
 * "SystemJobLabels" next-intl namespace — `t` is the caller's own
 * useTranslations('SystemJobLabels') result, since this plain util can't
 * call useTranslations() itself (see AuditLogsView/utils.ts's
 * getActionLabel for the same pattern). Falls back to the raw job name for
 * any value outside the known set — `SystemJobLog.name` is a plain string
 * column, not an enum, so this stays resilient to a stray/legacy value
 * rather than a broken "missing message" fallback. */
export function getJobLabel(name: string, t: (key: string) => string): string {
  const isKnownJob = (SYSTEM_JOB_NAMES as readonly string[]).includes(name);
  return isKnownJob ? t(name) : name;
}

export function toSystemStatusData(
  raw: RawSystemStatusResponse,
): SystemStatusData {
  return {
    summary: Object.fromEntries(
      Object.entries(raw.summary).map(([name, record]) => [
        name,
        record ? toSystemJobLogRecord(record) : null,
      ]),
    ),
    recent: raw.recent.map(toSystemJobLogRecord),
  };
}

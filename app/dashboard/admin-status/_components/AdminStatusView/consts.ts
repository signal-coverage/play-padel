import {
  KNOWN_SYSTEM_JOBS,
  CRON_JOB_NAMES,
  WEBHOOK_JOB_NAMES,
} from "@/core/systemJobs/consts";

export { KNOWN_SYSTEM_JOBS };

// Every known job name (e.g. "membership-grace-sweep") is itself a flat
// messages/*.json "SystemJobLabels" namespace key — see ./utils.ts's
// getJobLabel, which resolves each one against that namespace, passing in
// its own caller's useTranslations('SystemJobLabels') result — same
// factory-parameter pattern as AuditLogsView/utils.ts's getActionLabel.
export const SYSTEM_JOB_NAMES = [
  ...CRON_JOB_NAMES,
  ...WEBHOOK_JOB_NAMES,
] as const;

export const RECENT_ACTIVITY_ROW_COUNT = 50;

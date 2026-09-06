import {
  KNOWN_SYSTEM_JOBS,
  type CronJobName,
  type WebhookJobName,
} from "@/core/systemJobs/consts";

export { KNOWN_SYSTEM_JOBS };

// Human-readable label per known job name — see
// core/systemJobs/consts.ts for the hardcoded set of instrumented jobs this
// maps over (3 cron routes + 2 webhook receivers).
export const JOB_LABELS: Record<CronJobName | WebhookJobName, string> = {
  notifications: "Notifications",
  "membership-grace-sweep": "Membership grace sweep",
  "mercadopago-token-refresh": "Mercado Pago token refresh",
  "reset-preview-db": "Preview database reset",
  mercadopago: "Mercado Pago webhook",
  clerk: "Clerk webhook",
};

export const RECENT_ACTIVITY_ROW_COUNT = 50;

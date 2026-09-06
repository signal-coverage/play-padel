// The complete, hardcoded set of jobs this app currently instruments (see
// AGENTS.md-adjacent feature notes / prisma/schema.prisma's SystemJobLog) —
// 3 Vercel Cron routes and 2 webhook receivers. Adding a new instrumented job
// means adding it here so getLatestStatusPerJob's summary picks it up.
export const CRON_JOB_NAMES = [
  "notifications",
  "membership-grace-sweep",
  "mercadopago-token-refresh",
  "reset-preview-db",
] as const;

export const WEBHOOK_JOB_NAMES = ["mercadopago", "clerk"] as const;

export type CronJobName = (typeof CRON_JOB_NAMES)[number];
export type WebhookJobName = (typeof WEBHOOK_JOB_NAMES)[number];

export const KNOWN_SYSTEM_JOBS: ReadonlyArray<{
  kind: "CRON" | "WEBHOOK";
  name: CronJobName | WebhookJobName;
}> = [
  ...CRON_JOB_NAMES.map((name) => ({ kind: "CRON" as const, name })),
  ...WEBHOOK_JOB_NAMES.map((name) => ({ kind: "WEBHOOK" as const, name })),
];

import { createTranslator } from "use-intl/core";
import {
  DEFAULT_LOCALE,
  isValidLocale,
  type Locale,
} from "@/i18n/localeConstants";
import type { NotificationType } from "@/core/notifications/types";

export interface ResolvedNotificationContent {
  subject: string;
  html: string;
}

// Minimal, consistent wrapper shared by every notification type — not a
// per-type branded email template. See lib/notifications/content.ts's own
// module doc below for the reasoning: rendering happens here, centrally,
// driven by the recipient's OWN locale (never the triggering session's),
// so there is no longer a call-site-owned React Email component to keep in
// sync with a second language.
function wrapHtml(bodyText: string): string {
  return `<div style="font-family:sans-serif;color:#374151;font-size:14px;line-height:24px;max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;">${bodyText}</div>`;
}

// Params that carry a raw ISO date string (scheduledStart) or a raw
// number/currency pair (total/currency) are formatted HERE, using the
// recipient's own resolved locale — never at the call site, which has no
// reliable way to know a recipient's locale preference. Every other param
// is passed straight through as ICU substitution values.
function deriveParams(
  locale: Locale,
  params: Record<string, string | number>,
): Record<string, string | number> {
  const derived: Record<string, string | number> = { ...params };

  if (typeof params.scheduledStart === "string") {
    const date = new Date(params.scheduledStart);
    derived.date = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
    derived.time = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (params.total !== undefined && typeof params.currency === "string") {
    derived.formattedTotal = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: params.currency,
    }).format(Number(params.total));
  }

  return derived;
}

// Resolves which key inside NotificationContent[type] to read: a bare
// `{ subject, body }` pair for a type with only one possible message, or
// `{ subject, body }` nested one level deeper under `params.variant` for a
// type that covers more than one distinct real-world message (e.g.
// RESERVATION_UPDATED covers "updated"/"completed"/"noShow" — three
// genuinely different messages that all share the same NotificationType).
function resolveMessageKey(
  type: NotificationType,
  params: Record<string, string | number>,
): string {
  const variant = params.variant;
  return typeof variant === "string" ? `${type}.${variant}` : type;
}

/**
 * Renders the subject/html for a notification in the RECIPIENT's own
 * locale — never the triggering session's. Dynamically imports the right
 * messages/<locale>.json file (same pattern as i18n/request.ts) and reads
 * the "NotificationContent" namespace via use-intl's createTranslator,
 * which works with zero Next.js request context — exactly what a
 * background job (a cron sweep, a webhook, an admin action affecting a
 * different user) needs.
 */
export async function resolveNotificationContent(
  type: NotificationType,
  locale: Locale,
  params: Record<string, string | number> = {},
): Promise<ResolvedNotificationContent> {
  const safeLocale = isValidLocale(locale) ? locale : DEFAULT_LOCALE;
  const messages = (await import(`../../messages/${safeLocale}.json`)).default;

  const t = createTranslator({
    locale: safeLocale,
    messages,
    namespace: "NotificationContent",
  });

  const key = resolveMessageKey(type, params);
  const interpolationParams = deriveParams(safeLocale, params);

  const subject = t(`${key}.subject`, interpolationParams);
  const body = t(`${key}.body`, interpolationParams);

  return { subject, html: wrapHtml(body) };
}

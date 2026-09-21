import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { prisma } from "@/infrastructure/db/client";
import { DEFAULT_LOCALE } from "@/i18n/localeConstants";
import { resolveNotificationContent } from "@/lib/notifications/content";
import type {
  Notification,
  NotificationType,
  NotificationStatus,
} from "@/core/notifications/types";

// Every club on this platform operates in Argentina (see e.g.
// lib/utils/currency.ts's es-AR default) — fixed rather than per-club, since
// nothing else in this codebase resolves a specific club's own `timezone`
// field for date math either. Computing "today" from the server's own
// ambient timezone instead (typically UTC in production) would shift this
// boundary by a few hours around midnight relative to what's actually
// "today" for an Argentina-based club.
const CLUB_TIMEZONE = "America/Argentina/Buenos_Aires";

type NotificationRow = NonNullable<
  Awaited<ReturnType<typeof prisma.notification.findUnique>>
>;

function toNotification(
  row: NotificationRow,
  clubSlug: string | null = null,
): Notification {
  return {
    id: row.id,
    clubId: row.clubId,
    clubSlug,
    type: row.type as NotificationType,
    recipientId: row.recipientId,
    recipientEmail: row.recipientEmail,
    title: row.title,
    message: row.message,
    // Prisma's Json column type-checks as Prisma.JsonValue — narrowed here
    // the same way row.type/row.status are, since every row this app ever
    // writes stores a plain flat object (see createNotification below) or
    // nothing at all, never an array/primitive/nested structure.
    params: (row.params as Record<string, string | number> | null) ?? null,
    status: row.status as NotificationStatus,
    failureReason: row.failureReason ?? undefined,
    sentAt: row.sentAt ?? undefined,
    readAt: row.readAt ?? undefined,
    createdAt: row.createdAt,
  };
}

export interface CreateNotificationData {
  clubId: string | null;
  type: NotificationType;
  recipientId: string;
  recipientEmail: string;
  title: string;
  message: string;
  // Stored alongside the baked title/message (never instead of them — see
  // prisma/schema.prisma's Notification.params doc comment) so this
  // notification's title/message can be re-rendered live in whatever
  // locale the viewer is CURRENTLY using, on every later read.
  params: Record<string, string | number>;
}

export async function createNotification(
  data: CreateNotificationData,
): Promise<Notification> {
  const row = await prisma.notification.create({
    data: {
      clubId: data.clubId,
      type: data.type,
      recipientId: data.recipientId,
      recipientEmail: data.recipientEmail,
      title: data.title,
      message: data.message,
      params: data.params,
      status: "PENDING",
    },
  });
  return toNotification(row);
}

export async function updateNotificationStatus(
  id: string,
  status: NotificationStatus,
  opts?: { sentAt?: Date; failureReason?: string },
): Promise<Notification> {
  const row = await prisma.notification.update({
    where: { id },
    data: {
      status,
      ...(opts?.sentAt !== undefined && { sentAt: opts.sentAt }),
      ...(opts?.failureReason !== undefined && {
        failureReason: opts.failureReason,
      }),
    },
  });
  return toNotification(row);
}

// Reminder window: a reservation becomes eligible for a RESERVATION_REMINDER
// once its scheduledStart falls within the next 24h. This is an MVP default
// (documented in docs/reservation-flow.md); tune once real usage data exists.
const REMINDER_WINDOW_HOURS = 24;

/**
 * Returns CONFIRMED reservations with scheduledStart within the reminder
 * window [now, now + REMINDER_WINDOW_HOURS] that do NOT already have a SENT
 * RESERVATION_REMINDER notification created today (calendar day). The
 * same-day dedupe mirrors the previous appointment-reminder behavior so a
 * cron re-run within the same day doesn't double-send.
 */
export async function getPendingReservationReminders(
  now: Date = new Date(),
): Promise<
  Array<{
    reservationId: string;
    clubId: string;
    userId: string;
    userEmail: string | null;
    userName: string;
    scheduledStart: Date;
    courtName: string;
  }>
> {
  const windowStart = now;
  const windowEnd = new Date(
    now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      scheduledStart: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    include: {
      user: {
        select: { id: true, email: true, displayName: true },
      },
    },
  });

  if (reservations.length === 0) return [];

  // Start of "today" in Argentina time, derived from the injected `now`
  // (not a fresh `new Date()`, which previously ignored `now` entirely and
  // also used the server's ambient local timezone rather than a fixed one).
  const zonedNow = toZonedTime(now, CLUB_TIMEZONE);
  zonedNow.setHours(0, 0, 0, 0);
  const today = fromZonedTime(zonedNow, CLUB_TIMEZONE);

  // Batched dedup check — a SINGLE findMany covering every candidate
  // recipient, instead of a per-reservation findFirst in a loop (that exact
  // N+1 shape was previously found and fixed for listActiveClubs, see
  // core/clubs/services/clubs.service.ts). Reservations can span different
  // clubs, so this is scoped by type/status/createdAt/recipientId only; the
  // clubId part of the original per-reservation dedup key is applied
  // in-memory below via the Set.
  const userIds = reservations.map((r) => r.userId);
  const existingReminders = await prisma.notification.findMany({
    where: {
      type: "RESERVATION_REMINDER",
      status: "SENT",
      createdAt: { gte: today },
      recipientId: { in: userIds },
    },
    select: { recipientId: true, clubId: true },
  });
  const alreadyNotified = new Set(
    existingReminders.map((n) => `${n.recipientId}:${n.clubId}`),
  );

  const results = [];
  for (const r of reservations) {
    if (alreadyNotified.has(`${r.userId}:${r.clubId}`)) continue;

    results.push({
      reservationId: r.id,
      clubId: r.clubId,
      userId: r.userId,
      userEmail: r.user.email,
      userName: r.user.displayName,
      scheduledStart: r.scheduledStart,
      courtName: r.courtName,
    });
  }

  return results;
}

// Re-resolves title/message for every notification that has `params`
// stored, in the app's locale — the app is Spanish-only, so this always
// resolves to DEFAULT_LOCALE. A row with `params: null` (dispatched before
// this column existed, or genuinely has nothing to re-render from) is left
// exactly as originally baked — there's nothing here to regenerate it from.
async function hydrateLiveContent(
  notifications: Notification[],
): Promise<Notification[]> {
  if (notifications.every((n) => n.params == null)) return notifications;

  const locale = DEFAULT_LOCALE;

  return Promise.all(
    notifications.map(async (notification) => {
      if (notification.params == null) return notification;

      const { subject, html } = await resolveNotificationContent(
        notification.type,
        locale,
        notification.params,
      );
      return { ...notification, title: subject, message: html };
    }),
  );
}

export interface NotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listNotifications(
  clubId: string,
  filters: NotificationFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedNotifications> {
  const skip = (page - 1) * pageSize;

  const where = {
    clubId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          createdAt: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    // Every row here is already scoped to the one known `clubId` above (not
    // resolved per-row like listRecipientNotifications' own batch lookup),
    // but this admin/owner listing doesn't build any club-scoped deep-link
    // href from its results — `clubSlug` is left null rather than adding an
    // unused extra query.
    notifications: await hydrateLiveContent(
      rows.map((row) => toNotification(row)),
    ),
    total,
    page,
    pageSize,
  };
}

export async function listRecipientNotifications(
  recipientId: string,
  limit = 20,
): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Single batched lookup for every distinct club referenced across this
  // page of notifications — never one query per row (the exact N+1 pattern
  // already fixed elsewhere in this codebase, see app/api/player/clubs/
  // route.ts's own comment on the same anti-pattern). Notification.clubId
  // is a plain string column, not a real Prisma relation (see its own
  // schema doc comment), so this can't be a `select`/`include` join.
  const clubIds = [
    ...new Set(rows.map((row) => row.clubId).filter((id) => id !== null)),
  ];
  const clubSlugById = new Map<string, string>();
  if (clubIds.length > 0) {
    const clubs = await prisma.club.findMany({
      where: { id: { in: clubIds } },
      select: { id: true, slug: true },
    });
    for (const club of clubs) clubSlugById.set(club.id, club.slug);
  }

  return hydrateLiveContent(
    rows.map((row) =>
      toNotification(
        row,
        row.clubId ? (clubSlugById.get(row.clubId) ?? null) : null,
      ),
    ),
  );
}

export async function countUnreadNotifications(
  recipientId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { recipientId, readAt: null },
  });
}

export async function markAllAsRead(recipientId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { recipientId, readAt: null },
    data: { readAt: new Date() },
  });
}

// Scoped to recipientId (not a bare findUnique+update by id) so a signed-in
// user can never mark someone else's notification as read by guessing/
// reusing an id — mirrors markAllAsRead's own recipient scoping.
// updateMany (not update) so marking an already-read or someone-else's
// notification is a harmless no-op rather than a P2025 throw.
export async function markAsRead(
  recipientId: string,
  notificationId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId, readAt: null },
    data: { readAt: new Date() },
  });
}

// Pure data query — orchestration (dispatching a notification to every
// admin) lives in lib/notifications/dispatcher.ts's notifyAllAdmins, which
// imports this function. Importing dispatch() back into this file would
// create a circular import between the two modules, since dispatcher.ts
// already imports createNotification/updateNotificationStatus from here.
export async function listAdminRecipients(): Promise<
  Array<{ id: string; email: string; displayName: string }>
> {
  return prisma.userProfile.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true, displayName: true },
  });
}

import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { prisma } from "@/infrastructure/db/client";
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

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    clubId: row.clubId,
    type: row.type as NotificationType,
    recipientId: row.recipientId,
    recipientEmail: row.recipientEmail,
    title: row.title,
    message: row.message,
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
    notifications: rows.map(toNotification),
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
  return rows.map(toNotification);
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

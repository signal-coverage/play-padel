import { prisma } from "@/infrastructure/db/client";
import type {
  Notification,
  NotificationType,
  NotificationStatus,
} from "@/core/notifications/types";

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
    createdAt: row.createdAt,
  };
}

export interface CreateNotificationData {
  clubId: string;
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];
  for (const r of reservations) {
    const existing = await prisma.notification.findFirst({
      where: {
        clubId: r.clubId,
        type: "RESERVATION_REMINDER",
        recipientId: r.userId,
        status: "SENT",
        createdAt: { gte: today },
      },
    });
    if (existing) continue;

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

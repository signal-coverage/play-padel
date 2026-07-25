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
    organizationId: row.organizationId,
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
  organizationId: string;
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
      organizationId: data.organizationId,
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

/**
 * Returns appointments with scheduled start in [windowStart, windowEnd]
 * that do NOT have an existing SENT APPOINTMENT_REMINDER notification.
 */
export async function getPendingReminders(
  windowStart: Date,
  windowEnd: Date,
): Promise<
  Array<{
    appointmentId: string;
    organizationId: string;
    patientId: string;
    patientEmail: string | null;
    patientName: string;
    patientFirstName: string;
    scheduledStart: Date;
    professionalName: string | null;
    location: string | null;
  }>
> {
  // Find appointments in the time window with SCHEDULED status
  const appointments = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      scheduledStart: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    include: {
      patient: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  if (appointments.length === 0) return [];

  // For each appointment, check independently whether a reminder was already
  // sent today (calendar day). This allows a patient with two appointments in
  // the window to receive two reminders while preventing double-sends on
  // cron re-runs within the same day.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];
  for (const a of appointments) {
    const existing = await prisma.notification.findFirst({
      where: {
        organizationId: a.organizationId,
        type: "APPOINTMENT_REMINDER",
        recipientId: a.patientId,
        status: "SENT",
        createdAt: { gte: today },
      },
    });
    if (existing) continue;

    results.push({
      appointmentId: a.id,
      organizationId: a.organizationId,
      patientId: a.patientId,
      patientEmail: a.patient.email,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`.trim(),
      patientFirstName: a.patient.firstName,
      scheduledStart: a.scheduledStart,
      professionalName: a.professionalName,
      location: a.location,
    });
  }

  return results;
}

/**
 * Returns patients with birth month+day matching the given month/day
 * that do NOT have a SENT PATIENT_BIRTHDAY notification in the current calendar year.
 */
export async function getPendingBirthdays(
  orgId: string,
  month: number,
  day: number,
): Promise<
  Array<{
    patientId: string;
    organizationId: string;
    patientEmail: string | null;
    patientFirstName: string;
    patientName: string;
  }>
> {
  // Fetch all active patients in the org with a non-null birthDate
  const patients = await prisma.patient.findMany({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
      birthDate: { not: null },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      birthDate: true,
    },
  });

  // Filter to those whose birth month+day matches in UTC
  const birthdayPatients = patients.filter((p) => {
    if (!p.birthDate) return false;
    const bd = new Date(p.birthDate);
    return bd.getUTCMonth() + 1 === month && bd.getUTCDate() === day;
  });

  if (birthdayPatients.length === 0) return [];

  // Find patients that already got a SENT birthday this calendar year
  const currentYearStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), 0, 1),
  );
  const patientIds = birthdayPatients.map((p) => p.id);

  const sentThisYear = await prisma.notification.findMany({
    where: {
      type: "PATIENT_BIRTHDAY",
      status: "SENT",
      organizationId: orgId,
      recipientId: { in: patientIds },
      createdAt: { gte: currentYearStart },
    },
    select: { recipientId: true },
  });

  const alreadySentSet = new Set(sentThisYear.map((n) => n.recipientId));

  return birthdayPatients
    .filter((p) => !alreadySentSet.has(p.id))
    .map((p) => ({
      patientId: p.id,
      organizationId: orgId,
      patientEmail: p.email,
      patientFirstName: p.firstName,
      patientName: `${p.firstName} ${p.lastName}`.trim(),
    }));
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
  orgId: string,
  filters: NotificationFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedNotifications> {
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId: orgId,
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

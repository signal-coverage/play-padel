import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { startOfDay, endOfDay, eachDayOfInterval, format } from "date-fns";
import { render } from "@react-email/render";
import * as React from "react";
import type {
  Reservation,
  ReservationFilters,
  ReservationStatus,
} from "@/core/reservations/types";
import type {
  CreateReservationInput,
  UpdateReservationInput,
} from "@/core/reservations/schemas/reservation.schema";
import { SELF_CANCEL_CUTOFF_HOURS } from "@/core/reservations/consts";
import { dispatch } from "@/lib/notifications/dispatcher";
import { ReservationCancelled } from "@/lib/email/templates/ReservationCancelled";

type ReservationRow = NonNullable<
  Awaited<ReturnType<typeof prisma.reservation.findUnique>>
>;

const ACTIVE_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

function toReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    clubId: row.clubId,
    userId: row.userId,
    userName: row.userName,
    courtId: row.courtId,
    courtName: row.courtName,
    status: row.status as Reservation["status"],
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    notes: row.notes ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    cancelledBy: row.cancelledBy ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
  };
}

export async function listReservations(
  clubId: string,
  filters: ReservationFilters,
): Promise<Reservation[]> {
  const where: Prisma.ReservationWhereInput = {
    clubId,
    ...(filters.dateFrom && filters.dateTo
      ? {
          scheduledStart: {
            gte: startOfDay(new Date(filters.dateFrom)),
            lte: endOfDay(new Date(filters.dateTo)),
          },
        }
      : filters.date
        ? {
            scheduledStart: {
              gte: startOfDay(filters.date),
              lte: endOfDay(filters.date),
            },
          }
        : {}),
    ...(filters.courtId ? { courtId: filters.courtId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
  };

  const rows = await prisma.reservation.findMany({
    where,
    orderBy: { scheduledStart: "asc" },
  });

  return rows.map(toReservation);
}

export async function getReservation(
  clubId: string,
  id: string,
): Promise<Reservation | null> {
  const row = await prisma.reservation.findUnique({
    where: { id, clubId },
  });
  return row ? toReservation(row) : null;
}

/**
 * Owner's dashboard view: all reservations for a club, optionally narrowed to
 * a single calendar day (via `date`) or an inclusive multi-day range (via
 * `dateFrom`/`dateTo`), a specific court, and/or a set of statuses. With no
 * opts, returns upcoming active (SCHEDULED/CONFIRMED) reservations.
 */
export async function listReservationsByClub(
  clubId: string,
  opts?: {
    date?: Date;
    dateFrom?: Date;
    dateTo?: Date;
    courtId?: string;
    status?: ReservationStatus[];
  },
): Promise<Reservation[]> {
  const where: Prisma.ReservationWhereInput = {
    clubId,
    ...(opts?.date
      ? {
          scheduledStart: {
            gte: startOfDay(opts.date),
            lte: endOfDay(opts.date),
          },
        }
      : opts?.dateFrom && opts?.dateTo
        ? {
            scheduledStart: {
              gte: startOfDay(opts.dateFrom),
              lte: endOfDay(opts.dateTo),
            },
          }
        : { scheduledStart: { gte: new Date() } }),
    ...(opts?.courtId ? { courtId: opts.courtId } : {}),
    status: { in: opts?.status ?? [...ACTIVE_STATUSES] },
  };

  const rows = await prisma.reservation.findMany({
    where,
    orderBy: { scheduledStart: "asc" },
  });

  return rows.map(toReservation);
}

/**
 * Pure aggregation for the owner's dashboard summary: buckets `reservations`
 * by calendar day across the inclusive [from, to] range, including days with
 * zero reservations, counting both the total booked and how many of those
 * were cancelled per day.
 */
export function summarizeReservationsByDay(
  reservations: Reservation[],
  from: Date,
  to: Date,
): { date: string; total: number; cancelled: number }[] {
  const days = eachDayOfInterval({
    start: startOfDay(from),
    end: startOfDay(to),
  });

  return days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const sameDay = reservations.filter(
      (reservation) =>
        format(reservation.scheduledStart, "yyyy-MM-dd") === dateStr,
    );
    return {
      date: dateStr,
      total: sameDay.length,
      cancelled: sameDay.filter(
        (reservation) => reservation.status === "CANCELLED",
      ).length,
    };
  });
}

/**
 * Player's "my reservations" view: all of a user's reservations across every
 * club. With no opts (or includePast: false), returns only upcoming active
 * reservations; includePast: true returns everything, including past/cancelled.
 */
export async function listReservationsByUser(
  userId: string,
  opts?: { includePast?: boolean },
): Promise<Reservation[]> {
  const where: Prisma.ReservationWhereInput = {
    userId,
    ...(opts?.includePast
      ? {}
      : {
          scheduledStart: { gte: new Date() },
          status: { in: [...ACTIVE_STATUSES] },
        }),
  };

  const rows = await prisma.reservation.findMany({
    where,
    orderBy: { scheduledStart: "asc" },
  });

  return rows.map(toReservation);
}

/**
 * Court-level conflict check: is this club's court already locked by an
 * active reservation overlapping the given time range?
 */
export async function checkCourtConflict({
  clubId,
  courtId,
  scheduledStart,
  scheduledEnd,
  excludeId,
}: {
  clubId: string;
  courtId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  excludeId?: string;
}): Promise<boolean> {
  const conflict = await prisma.reservation.findFirst({
    where: {
      clubId,
      courtId,
      status: { in: [...ACTIVE_STATUSES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      // Overlap condition: existing.start < new.end AND existing.end > new.start
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
    select: { id: true },
  });
  return conflict !== null;
}

/**
 * MVP rule: one active reservation per user per overlapping time range,
 * across ALL clubs (prevents a user double-booking two courts — possibly at
 * two different clubs — at once). Intentionally NOT scoped by clubId.
 */
export async function checkUserOverlapConflict({
  userId,
  scheduledStart,
  scheduledEnd,
  excludeId,
}: {
  userId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  excludeId?: string;
}): Promise<boolean> {
  const conflict = await prisma.reservation.findFirst({
    where: {
      userId,
      status: { in: [...ACTIVE_STATUSES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
    select: { id: true },
  });
  return conflict !== null;
}

export async function createReservation(
  createdBy: string,
  input: CreateReservationInput,
): Promise<Reservation> {
  const court = await prisma.court.findUnique({
    where: { id: input.courtId },
    select: { id: true, clubId: true, name: true },
  });
  if (!court) {
    throw new Error("Court not found");
  }

  const user = await prisma.userProfile.findUnique({
    where: { id: input.userId },
    select: { displayName: true },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const scheduledStart = new Date(input.scheduledStart);
  const scheduledEnd = new Date(input.scheduledEnd);

  const [courtConflict, userConflict] = await Promise.all([
    checkCourtConflict({
      clubId: court.clubId,
      courtId: court.id,
      scheduledStart,
      scheduledEnd,
    }),
    checkUserOverlapConflict({
      userId: input.userId,
      scheduledStart,
      scheduledEnd,
    }),
  ]);

  if (courtConflict) {
    throw new Error("This slot is no longer available. Pick another time.");
  }
  if (userConflict) {
    throw new Error(
      "You already have a reservation at this time. Cancel it or pick a different slot.",
    );
  }

  // MVP rule: instant confirmation, no owner-approval step (docs/reservation-flow.md)
  const row = await prisma.reservation.create({
    data: {
      clubId: court.clubId,
      userId: input.userId,
      userName: user.displayName,
      courtId: court.id,
      courtName: court.name,
      status: "CONFIRMED",
      scheduledStart,
      scheduledEnd,
      notes: input.notes ?? null,
      createdBy,
      updatedBy: createdBy,
    },
  });

  return toReservation(row);
}

export async function updateReservation(
  clubId: string,
  id: string,
  updatedBy: string,
  input: UpdateReservationInput,
): Promise<Reservation> {
  let userName: string | undefined;
  if (input.userId) {
    const user = await prisma.userProfile.findUnique({
      where: { id: input.userId },
      select: { displayName: true },
    });
    if (user) {
      userName = user.displayName;
    }
  }

  let courtName: string | undefined;
  if (input.courtId) {
    const court = await prisma.court.findUnique({
      where: { id: input.courtId },
      select: { name: true },
    });
    if (court) {
      courtName = court.name;
    }
  }

  const row = await prisma.reservation.update({
    where: { id, clubId },
    data: {
      ...(input.userId !== undefined && { userId: input.userId }),
      ...(userName !== undefined && { userName }),
      ...(input.courtId !== undefined && { courtId: input.courtId }),
      ...(courtName !== undefined && { courtName }),
      ...(input.scheduledStart !== undefined && {
        scheduledStart: new Date(input.scheduledStart),
      }),
      ...(input.scheduledEnd !== undefined && {
        scheduledEnd: new Date(input.scheduledEnd),
      }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
      updatedBy,
    },
  });

  return toReservation(row);
}

/**
 * Pure rule check — does NOT enforce anything by itself. Callers (route
 * handlers) must call this before allowing a non-owner user to cancel their
 * own reservation; owners can cancel any of their club's reservations at any
 * time regardless of this check.
 */
export function canSelfCancel(
  reservation: Pick<Reservation, "status" | "scheduledStart">,
): boolean {
  if (
    !ACTIVE_STATUSES.includes(
      reservation.status as (typeof ACTIVE_STATUSES)[number],
    )
  ) {
    return false;
  }
  const cutoffMs = SELF_CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;
  return Date.now() < reservation.scheduledStart.getTime() - cutoffMs;
}

export async function cancelReservation(
  id: string,
  cancelledBy: string,
): Promise<Reservation> {
  const row = await prisma.reservation.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy,
      updatedBy: cancelledBy,
    },
  });

  // Dispatch cancellation notification — non-throwing, does not affect return value
  try {
    const user = await prisma.userProfile.findUnique({
      where: { id: row.userId },
      select: { email: true, displayName: true },
    });

    const userName = user?.displayName ?? row.userName;

    const html = await render(
      React.createElement(ReservationCancelled, {
        userName,
        scheduledStart: row.scheduledStart,
        courtName: row.courtName,
      }),
    );

    await dispatch({
      type: "RESERVATION_CANCELLED",
      clubId: row.clubId,
      recipientId: row.userId,
      recipientEmail: user?.email ?? null,
      recipientName: userName,
      subject: "Your reservation has been cancelled",
      html,
    });
  } catch {
    // notification failure must not affect reservation cancellation
  }

  return toReservation(row);
}

export async function completeReservation(
  clubId: string,
  id: string,
  updatedBy: string,
): Promise<Reservation> {
  const row = await prisma.reservation.update({
    where: { id, clubId },
    data: {
      status: "COMPLETED",
      updatedBy,
    },
  });
  return toReservation(row);
}

export async function noShowReservation(
  clubId: string,
  id: string,
  updatedBy: string,
): Promise<Reservation> {
  const row = await prisma.reservation.update({
    where: { id, clubId },
    data: {
      status: "NO_SHOW",
      updatedBy,
    },
  });
  return toReservation(row);
}

/**
 * Not club-scoped: a user's display name can change independent of which
 * club(s) they've booked at, so this updates every active reservation of
 * theirs regardless of club.
 */
export async function syncUserNameOnReservations(
  userId: string,
  newName: string,
): Promise<void> {
  await prisma.reservation.updateMany({
    where: {
      userId,
      status: { not: "CANCELLED" },
    },
    data: { userName: newName },
  });
}

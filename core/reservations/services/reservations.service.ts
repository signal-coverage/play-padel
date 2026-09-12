import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { startOfDay, endOfDay, eachDayOfInterval, format } from "date-fns";
import { render } from "@react-email/render";
import * as React from "react";
import type {
  Reservation,
  ReservationFilters,
  ReservationPaymentMethod,
  ReservationStatus,
  TicketData,
} from "@/core/reservations/types";
import type {
  CreateReservationInput,
  UpdateReservationInput,
} from "@/core/reservations/schemas/reservation.schema";
import {
  SELF_CANCEL_CUTOFF_HOURS,
  ACTIVE_RESERVATION_STATUSES,
  PAYMENT_HOLD_MINUTES,
} from "@/core/reservations/consts";
import { dispatch } from "@/lib/notifications/dispatcher";
import { ReservationCancelled } from "@/lib/email/templates/ReservationCancelled";
import { logAudit } from "@/core/audit/services/audit.service";
import { notifyWaitlistForSlot } from "@/core/waitlist/services/waitlist.service";
import {
  validatePartnerIds,
  tagReservationPartners,
} from "@/core/reservations/services/reservationPartners.service";

type ReservationRow = NonNullable<
  Awaited<ReturnType<typeof prisma.reservation.findUnique>>
>;

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
    paymentExpiresAt: row.paymentExpiresAt ?? undefined,
    paymentMethod:
      (row.paymentMethod as Reservation["paymentMethod"]) ?? undefined,
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
    status: { in: opts?.status ?? [...ACTIVE_RESERVATION_STATUSES] },
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
 * zero reservations, counting the total booked, how many were cancelled, and
 * how many were no-shows per day.
 */
export function summarizeReservationsByDay(
  reservations: Reservation[],
  from: Date,
  to: Date,
): { date: string; total: number; cancelled: number; noShow: number }[] {
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
      noShow: sameDay.filter((reservation) => reservation.status === "NO_SHOW")
        .length,
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
          status: { in: [...ACTIVE_RESERVATION_STATUSES] },
        }),
  };

  const rows = await prisma.reservation.findMany({
    where,
    orderBy: { scheduledStart: "asc" },
  });

  return rows.map(toReservation);
}

// Detects a violation of the "reservations_no_overlapping_confirmed"
// Postgres EXCLUDE constraint (migration 20260905200000) — the real
// SQLSTATE, `23P01` (exclusion_violation), arrives nested inside the Neon
// driver adapter's own error wrapping rather than as one of Prisma's
// standard P-codes; this exact shape was verified against the real dev
// database (Prisma 7.9.1 + @prisma/adapter-neon), not guessed.
function isConfirmedOverlapViolation(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const cause = (
    err.meta as { driverAdapterError?: { cause?: { code?: string } } }
  )?.driverAdapterError?.cause;
  return cause?.code === "23P01";
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
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      // Overlap condition: existing.start < new.end AND existing.end > new.start
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
      // A SCHEDULED (pending-payment) hold that's past its expiry no longer
      // blocks the slot — treated as lapsed rather than actively cancelled
      // (see docs: Payments spec, "Handled lazily").
      NOT: {
        status: "SCHEDULED",
        paymentExpiresAt: { lt: new Date() },
      },
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
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
      // A SCHEDULED (pending-payment) hold that's past its expiry no longer
      // blocks the slot — treated as lapsed rather than actively cancelled
      // (see docs: Payments spec, "Handled lazily").
      NOT: {
        status: "SCHEDULED",
        paymentExpiresAt: { lt: new Date() },
      },
    },
    select: { id: true },
  });
  return conflict !== null;
}

/**
 * Is this court closed (an active CourtClosure) for any part of the given
 * time range? Returns the closure's reason if so, for a specific error
 * message — unlike the boolean checkCourtConflict/checkUserOverlapConflict,
 * since "This court is closed: {reason}" is meaningfully more useful to a
 * player than a generic conflict message.
 */
export async function checkCourtClosureConflict({
  courtId,
  scheduledStart,
  scheduledEnd,
}: {
  courtId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}): Promise<string | null> {
  const closure = await prisma.courtClosure.findFirst({
    where: {
      courtId,
      cancelledAt: null,
      startsAt: { lt: scheduledEnd },
      endsAt: { gt: scheduledStart },
    },
    select: { reason: true },
    orderBy: { startsAt: "asc" },
  });
  return closure?.reason ?? null;
}

export async function createReservation(
  createdBy: string,
  input: CreateReservationInput,
  opts?: {
    pendingPayment?: boolean;
    holdMinutes?: number;
    paymentMethod?: ReservationPaymentMethod;
  },
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

  // Validated up front, before any reservation write — a bad partner tag
  // (self-tag, unknown player, too many) must fail the whole booking rather
  // than leaving an orphaned reservation with no tags. See
  // reservationPartners.service.ts's validatePartnerIds for the full rules.
  // Empty/omitted partnerIds resolves to [] with no DB call — fully
  // additive, matches every pre-existing createReservation caller exactly.
  const partnerIds = await validatePartnerIds(input.userId, input.partnerIds);

  const scheduledStart = new Date(input.scheduledStart);
  const scheduledEnd = new Date(input.scheduledEnd);

  const [courtConflict, userConflict, closureReason] = await Promise.all([
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
    checkCourtClosureConflict({
      courtId: court.id,
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
  if (closureReason) {
    throw new Error(`This court is closed: ${closureReason}`);
  }

  const pendingPayment = opts?.pendingPayment ?? false;
  const holdMinutes = opts?.holdMinutes ?? PAYMENT_HOLD_MINUTES;

  // MVP rule: instant confirmation, no owner-approval step (docs/reservation-flow.md).
  // Exception: a club that requires prepayment gets a SCHEDULED hold instead,
  // confirmed later by the Mercado Pago webhook (see Payments spec).
  let row;
  try {
    row = await prisma.reservation.create({
      data: {
        clubId: court.clubId,
        userId: input.userId,
        userName: user.displayName,
        courtId: court.id,
        courtName: court.name,
        status: pendingPayment ? "SCHEDULED" : "CONFIRMED",
        scheduledStart,
        scheduledEnd,
        notes: input.notes ?? null,
        paymentExpiresAt: pendingPayment
          ? new Date(Date.now() + holdMinutes * 60_000)
          : null,
        paymentMethod: pendingPayment ? (opts?.paymentMethod ?? null) : null,
        createdBy,
        updatedBy: createdBy,
      },
    });
  } catch (err) {
    if (isConfirmedOverlapViolation(err)) {
      // checkCourtConflict above is a best-effort, non-race-proof check — two
      // concurrent createReservation calls can both pass it before either
      // write lands. The DB-level exclusion constraint on CONFIRMED
      // reservations (migration 20260905200000) is the real backstop; this
      // translates its failure into the same friendly message the
      // application-level check already gives for the common case.
      throw new Error("This slot is no longer available. Pick another time.");
    }
    throw err;
  }

  // Best-effort side effect (see tagReservationPartners) — a failure here
  // must not undo an otherwise-successful booking.
  if (partnerIds.length > 0) {
    await tagReservationPartners(row.id, partnerIds);
  }

  logAudit({
    clubId: row.clubId,
    userId: createdBy,
    userDisplayName: user.displayName,
    action: "reservation.created",
    entity: "Reservation",
    entityId: row.id,
    metadata: { courtId: row.courtId, courtName: row.courtName },
  });

  return toReservation(row);
}

/**
 * Notifies a reservation's owner in-app that something about it changed —
 * shared by updateReservation (an owner/staff reschedule or reassignment),
 * completeReservation, and noShowReservation, all of which change a
 * reservation a player could be looking at in "My Reservations" at that
 * exact moment with zero live signal otherwise.
 */
async function notifyReservationUpdated(
  row: ReservationRow,
  subject: string,
  html: string,
): Promise<void> {
  try {
    const user = await prisma.userProfile.findUnique({
      where: { id: row.userId },
      select: { email: true, displayName: true },
    });
    await dispatch({
      type: "RESERVATION_UPDATED",
      clubId: row.clubId,
      recipientId: row.userId,
      recipientEmail: user?.email ?? null,
      recipientName: user?.displayName ?? row.userName,
      subject,
      html,
      sendEmail: false,
    });
  } catch {
    // notification failure must not affect the reservation mutation itself
  }
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

  await notifyReservationUpdated(
    row,
    "Your reservation has been updated",
    "One of your reservations was updated by the club. Check My Reservations for the latest details.",
  );

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
    !ACTIVE_RESERVATION_STATUSES.includes(
      reservation.status as (typeof ACTIVE_RESERVATION_STATUSES)[number],
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

  try {
    await notifyWaitlistForSlot(
      row.courtId,
      row.scheduledStart,
      row.scheduledEnd,
      row.userId,
    );
  } catch {
    // waitlist notification failure must not affect reservation cancellation
  }

  const actor = await prisma.userProfile.findUnique({
    where: { id: cancelledBy },
    select: { displayName: true },
  });
  logAudit({
    clubId: row.clubId,
    userId: cancelledBy,
    userDisplayName: actor?.displayName ?? row.userName,
    action: "reservation.cancelled",
    entity: "Reservation",
    entityId: row.id,
    metadata: { courtId: row.courtId, courtName: row.courtName },
  });

  return toReservation(row);
}

// Transitions a pending-payment hold to CONFIRMED once its payment is
// confirmed — called from both the Mercado Pago webhook route (default
// `updatedBy`, no real user in that context) and the owner-facing
// confirmTransfer route action (passes the real owner's userId, so the audit
// trail attributes a manual confirmation to the owner who actually performed
// it, not to the webhook). No audit-log call here — core/billing's
// recordPayment (called right before this at both call sites) already logs
// the "payment.confirmed" audit event for the same transaction; logging
// reservation.created already covers the reservation's own audit trail from
// when the hold was created.
export async function confirmReservationPayment(
  id: string,
  updatedBy: string = "system:mercadopago-webhook",
): Promise<Reservation> {
  const row = await prisma.reservation.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      updatedBy,
    },
  });
  return toReservation(row);
}

// Club-agnostic lookup — the only caller is the Mercado Pago webhook route,
// which doesn't know which club a payment belongs to until after this
// lookup. Not used by (and must not be exposed through) any public API route.
export async function findReservationById(
  id: string,
): Promise<Reservation | null> {
  const row = await prisma.reservation.findUnique({ where: { id } });
  return row ? toReservation(row) : null;
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

  const actor = await prisma.userProfile.findUnique({
    where: { id: updatedBy },
    select: { displayName: true },
  });
  logAudit({
    clubId: row.clubId,
    userId: updatedBy,
    userDisplayName: actor?.displayName ?? row.userName,
    action: "reservation.completed",
    entity: "Reservation",
    entityId: row.id,
    metadata: { courtId: row.courtId, courtName: row.courtName },
  });

  await notifyReservationUpdated(
    row,
    "Your reservation is complete",
    "Your reservation has been marked as completed.",
  );

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

  const actor = await prisma.userProfile.findUnique({
    where: { id: updatedBy },
    select: { displayName: true },
  });
  logAudit({
    clubId: row.clubId,
    userId: updatedBy,
    userDisplayName: actor?.displayName ?? row.userName,
    action: "reservation.no_show",
    entity: "Reservation",
    entityId: row.id,
    metadata: { courtId: row.courtId, courtName: row.courtName },
  });

  await notifyReservationUpdated(
    row,
    "You were marked as a no-show",
    "You were marked as a no-show for a reservation. If you believe this is a mistake, contact the club.",
  );

  return toReservation(row);
}

/**
 * Booking-confirmation ticket data for the player-facing "My Reservations"
 * ticket PDF — proof of the BOOKING, not of payment, so it's available for
 * any CONFIRMED reservation regardless of whether it was ever paid (unlike
 * core/billing's getReceiptData, which requires a COMPLETED payment). Returns
 * null for any other status or an unknown id.
 */
export async function getTicketData(
  reservationId: string,
): Promise<TicketData | null> {
  const row = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { club: true },
  });
  if (!row || row.status !== "CONFIRMED") return null;

  return {
    id: row.id,
    clubName: row.club.name,
    courtName: row.courtName,
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    userName: row.userName,
    status: row.status as ReservationStatus,
  };
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

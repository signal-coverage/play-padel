import "server-only";

import type { Club, Payment, Reservation } from "./generated/prisma/client";
import { Prisma, ReservationStatus } from "./generated/prisma/client";
import { prisma } from "./prisma";

/** Lazy-expiry window for unpaid deposit reservations (spec: assumed 30 minutes). */
const PENDING_PAYMENT_TIMEOUT_MINUTES = 30;

const ACTIVE_STATUSES = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.PENDING_PAYMENT,
] as const;

/**
 * Thrown when a booking attempt loses the race against the DB-level
 * `reservation_no_overlap` exclusion constraint (Postgres SQLSTATE 23P01).
 * Server Actions should catch this and return a user-facing conflict
 * message instead of leaking the raw database error.
 */
export class SlotUnavailableError extends Error {
  constructor(message = "This slot is no longer available") {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

/** Thrown when a user attempts to act on a reservation they do not own. */
export class ReservationForbiddenError extends Error {
  constructor(message = "You can only manage your own reservations") {
    super(message);
    this.name = "ReservationForbiddenError";
  }
}

/** Thrown when a reservation id does not exist. */
export class ReservationNotFoundError extends Error {
  constructor(message = "Reservation not found") {
    super(message);
    this.name = "ReservationNotFoundError";
  }
}

/**
 * Detects whether an error thrown by `prisma.reservation.create()` (or any
 * write hitting the `reservation_no_overlap` EXCLUDE constraint) corresponds
 * to Postgres SQLSTATE 23P01 (exclusion_violation).
 *
 * Prisma does not natively map exclusion-constraint violations the way it
 * maps unique/FK violations (P2002/P2003) — depending on the query path they
 * surface as either `PrismaClientKnownRequestError` (with the raw code in
 * `meta`) or `PrismaClientUnknownRequestError` (message-only). We check both
 * shapes defensively, matching on the SQLSTATE and the constraint name.
 */
function isExclusionViolation(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) &&
    !(error instanceof Prisma.PrismaClientUnknownRequestError)
  ) {
    return false;
  }

  const meta = "meta" in error ? error.meta : undefined;
  const metaText = meta ? JSON.stringify(meta) : "";
  const haystack = `${error.message} ${metaText}`;

  return (
    haystack.includes("23P01") ||
    haystack.includes("reservation_no_overlap") ||
    haystack.toLowerCase().includes("exclusion constraint")
  );
}

/**
 * Releases stale `PENDING_PAYMENT` reservations on a court back to the pool.
 * No cron/scheduler exists in this project (design: "Lazy expiry, no cron"),
 * so this runs on every read/write that cares whether a slot is free.
 */
export async function expireStalePendingReservations(
  courtId: string
): Promise<void> {
  await prisma.reservation.updateMany({
    where: {
      courtId,
      status: ReservationStatus.PENDING_PAYMENT,
      createdAt: {
        lt: new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MINUTES * 60_000),
      },
    },
    data: { status: ReservationStatus.EXPIRED },
  });
}

export type AvailabilitySlot = {
  startsAt: Date;
  endsAt: Date;
  available: boolean;
};

/**
 * Converts a wall-clock date + time-of-day in an IANA timezone to the
 * corresponding UTC instant.
 *
 * There is no `date-fns-tz` (or similar) dependency in this project, so this
 * uses the standard "round-trip through Intl" trick: guess the instant by
 * treating the wall time as UTC, then measure how far that guess's rendered
 * wall time in the target zone drifts from the intended wall time, and
 * correct by that offset. This is accurate for all but the (here,
 * irrelevant) DST-transition instant itself.
 */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(guess);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  // `hour12: false` renders midnight as "24" in some environments — normalize.
  const renderedHour = get("hour") % 24;

  const renderedAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    renderedHour,
    get("minute"),
    get("second")
  );

  const offsetMs = renderedAsUtc - guess.getTime();

  return new Date(guess.getTime() - offsetMs);
}

function parseTimeOfDay(time: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = time.split(":");
  return { hour: Number(hourStr), minute: Number(minuteStr ?? 0) };
}

/**
 * Builds the day's slot grid for a court (spec: "Slot Availability View") —
 * derived from `slotMinutes` and the club's open/close hours, computed in
 * the club's timezone, with CONFIRMED/PENDING_PAYMENT reservations marked
 * unavailable. Runs lazy expiry first so stale pending reservations don't
 * incorrectly block a slot.
 *
 * @param date Calendar day in the club's local timezone, as `YYYY-MM-DD`.
 */
export async function listAvailability(courtId: string, date: string) {
  const court = await prisma.court.findUniqueOrThrow({
    where: { id: courtId },
    include: { club: true },
  });

  await expireStalePendingReservations(courtId);

  const [year, month, day] = date.split("-").map(Number);
  const open = parseTimeOfDay(court.club.openTime);
  const close = parseTimeOfDay(court.club.closeTime);

  const dayStart = zonedTimeToUtc(
    year,
    month,
    day,
    open.hour,
    open.minute,
    court.club.timezone
  );
  const dayEnd = zonedTimeToUtc(
    year,
    month,
    day,
    close.hour,
    close.minute,
    court.club.timezone
  );

  const activeReservations = await prisma.reservation.findMany({
    where: {
      courtId,
      status: { in: [...ACTIVE_STATUSES] },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: { startsAt: true, endsAt: true },
  });

  const slots: AvailabilitySlot[] = [];
  const slotMs = court.slotMinutes * 60_000;

  for (
    let slotStart = dayStart.getTime();
    slotStart + slotMs <= dayEnd.getTime();
    slotStart += slotMs
  ) {
    const startsAt = new Date(slotStart);
    const endsAt = new Date(slotStart + slotMs);

    const overlaps = activeReservations.some(
      (reservation) =>
        reservation.startsAt < endsAt && reservation.endsAt > startsAt
    );

    slots.push({ startsAt, endsAt, available: !overlaps });
  }

  return { court, slots };
}

export type CreateReservationInput = {
  courtId: string;
  userId: string;
  startsAt: Date;
  endsAt: Date;
};

export type CreateReservationResult =
  | { kind: "confirmed"; reservation: Reservation }
  | {
      kind: "pending_payment";
      reservation: Reservation;
      payment: Payment;
      club: Club;
    };

/**
 * Creates a reservation for a slot (spec: "Instant Booking" / "Pending
 * Booking"). Free clubs confirm immediately; deposit clubs create a
 * `PENDING_PAYMENT` reservation + `Payment` row in one transaction so a
 * caller can then call `lib/payments.ts#createPreference` to redirect the
 * user to checkout.
 *
 * Double-booking is prevented at the DB layer (design: "Raw-SQL exclusion
 * constraint") — a conflicting insert throws {@link SlotUnavailableError}
 * instead of silently succeeding or leaking the raw Postgres error.
 */
export async function createReservation({
  courtId,
  userId,
  startsAt,
  endsAt,
}: CreateReservationInput): Promise<CreateReservationResult> {
  await expireStalePendingReservations(courtId);

  const court = await prisma.court.findUniqueOrThrow({
    where: { id: courtId },
    include: { club: true },
  });

  try {
    if (!court.club.depositRequired) {
      const reservation = await prisma.reservation.create({
        data: {
          courtId,
          userId,
          startsAt,
          endsAt,
          status: ReservationStatus.CONFIRMED,
        },
      });

      return { kind: "confirmed", reservation };
    }

    // depositAmountArs is required whenever depositRequired is true (spec:
    // "Deposit-required club has an amount") — enforced at write time by the
    // seed script / future admin tooling, not by the DB schema itself.
    const depositAmountArs = court.club.depositAmountArs;
    if (depositAmountArs == null) {
      throw new Error(
        `Club ${court.club.id} has depositRequired=true but no depositAmountArs configured`
      );
    }

    const { reservation, payment } = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({
        data: {
          courtId,
          userId,
          startsAt,
          endsAt,
          status: ReservationStatus.PENDING_PAYMENT,
        },
      });

      const payment = await tx.payment.create({
        data: {
          reservationId: reservation.id,
          amountArs: depositAmountArs,
        },
      });

      return { reservation, payment };
    });

    return {
      kind: "pending_payment",
      reservation,
      payment,
      club: court.club,
    };
  } catch (error) {
    if (isExclusionViolation(error)) {
      throw new SlotUnavailableError();
    }
    throw error;
  }
}

/**
 * Cancels a reservation (spec: "Cancellation") — owner-only, no refund call
 * even for a paid deposit (spec: "Forfeiture on Cancellation"). Moving to
 * `CANCELLED` automatically frees the slot because the exclusion
 * constraint's partial `WHERE` clause only covers CONFIRMED/PENDING_PAYMENT.
 */
export async function cancelReservation({
  reservationId,
  userId,
}: {
  reservationId: string;
  userId: string;
}): Promise<void> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new ReservationNotFoundError();
  }

  if (reservation.userId !== userId) {
    throw new ReservationForbiddenError();
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: ReservationStatus.CANCELLED },
  });
}

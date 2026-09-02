import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { logAudit } from "@/core/audit/services/audit.service";
import { CLUB_OPERATIONAL_WHERE } from "@/lib/mercadopago/operationalStatus";
import { startOfDay, endOfDay, addMinutes, format } from "date-fns";
import type {
  Court,
  CourtAvailability,
  AvailabilityEntry,
  Slot,
  CreateCourtInput,
  UpdateCourtInput,
  CourtClosure,
  CreateClosureInput,
} from "@/core/courts/types";
import { ACTIVE_RESERVATION_STATUSES } from "@/core/reservations/consts";
import { resolveDefaultCourtAvailability } from "@/core/clubs/services/operatingHours.service";

type CourtRow = NonNullable<
  Awaited<ReturnType<typeof prisma.court.findUnique>>
>;
type CourtAvailabilityRow = NonNullable<
  Awaited<ReturnType<typeof prisma.courtAvailability.findUnique>>
>;
type CourtClosureRow = NonNullable<
  Awaited<ReturnType<typeof prisma.courtClosure.findUnique>>
>;

export class DuplicateCourtNameError extends Error {
  constructor(name: string) {
    super(`A court named "${name}" already exists in this club`);
    this.name = "DuplicateCourtNameError";
  }
}

// Case-insensitive, scoped to the club and to live (non-soft-deleted) courts
// — a deactivated court's old name is free to reuse. `excludeCourtId` lets
// `updateCourt` keep a court's own current name without tripping over itself.
async function assertNoDuplicateCourtName(
  clubId: string,
  name: string,
  excludeCourtId?: string,
): Promise<void> {
  const existing = await prisma.court.findFirst({
    where: {
      clubId,
      deletedAt: null,
      name: { equals: name, mode: "insensitive" },
      ...(excludeCourtId ? { id: { not: excludeCourtId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new DuplicateCourtNameError(name);
  }
}

function toCourt(row: CourtRow): Court {
  return {
    id: row.id,
    clubId: row.clubId,
    name: row.name,
    surface: row.surface ?? undefined,
    indoor: row.indoor,
    color: row.color ?? undefined,
    photoUrl: row.photoUrl ?? undefined,
    slotDurationMinutes: row.slotDurationMinutes,
    reservationFee: row.reservationFee ?? undefined,
    courtPrice: row.courtPrice ?? undefined,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
    deletedAt: row.deletedAt ?? undefined,
    deletedBy: row.deletedBy ?? undefined,
  };
}

function toCourtAvailability(row: CourtAvailabilityRow): CourtAvailability {
  return {
    id: row.id,
    courtId: row.courtId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    active: row.active,
    createdAt: row.createdAt,
  };
}

function toCourtClosure(row: CourtClosureRow): CourtClosure {
  return {
    id: row.id,
    courtId: row.courtId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    reason: row.reason,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    cancelledBy: row.cancelledBy ?? undefined,
  };
}

export async function createCourt(
  clubId: string,
  input: CreateCourtInput,
  createdBy: string,
): Promise<Court> {
  await assertNoDuplicateCourtName(clubId, input.name);

  const row = await prisma.court.create({
    data: {
      clubId,
      name: input.name,
      surface: input.surface ?? null,
      indoor: input.indoor ?? false,
      color: input.color ?? null,
      photoUrl: input.photoUrl ?? null,
      ...(input.slotDurationMinutes !== undefined && {
        slotDurationMinutes: input.slotDurationMinutes,
      }),
      reservationFee: input.reservationFee ?? null,
      courtPrice: input.courtPrice ?? null,
      createdBy,
      updatedBy: createdBy,
    },
  });

  // A brand-new court always ends up with real CourtAvailability rows the
  // moment it's created — never zero rows. Explicit availability is seeded
  // as-is (no prior rows to delete, so a bare createMany is fine here);
  // omitted/empty falls back to the club's own operating hours (or that
  // service's own all-week fallback for a club with none on file).
  const availability =
    input.availability && input.availability.length > 0
      ? input.availability
      : await resolveDefaultCourtAvailability(clubId);

  await prisma.courtAvailability.createMany({
    data: availability.map((entry) => ({
      courtId: row.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
    })),
  });

  const creator = await prisma.userProfile.findUnique({
    where: { id: createdBy },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: createdBy,
    userDisplayName: creator?.displayName ?? createdBy,
    action: "court.created",
    entity: "Court",
    entityId: row.id,
    metadata: { name: row.name },
  });

  return toCourt(row);
}

export async function updateCourt(
  clubId: string,
  id: string,
  input: UpdateCourtInput,
  updatedBy: string,
): Promise<Court> {
  if (input.name !== undefined) {
    await assertNoDuplicateCourtName(clubId, input.name, id);
  }

  const row = await prisma.court.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.surface !== undefined && { surface: input.surface ?? null }),
      ...(input.indoor !== undefined && { indoor: input.indoor }),
      ...(input.color !== undefined && { color: input.color ?? null }),
      ...(input.photoUrl !== undefined && {
        photoUrl: input.photoUrl ?? null,
      }),
      ...(input.slotDurationMinutes !== undefined && {
        slotDurationMinutes: input.slotDurationMinutes,
      }),
      ...(input.reservationFee !== undefined && {
        reservationFee: input.reservationFee,
      }),
      ...(input.courtPrice !== undefined && { courtPrice: input.courtPrice }),
      ...(input.active !== undefined && { active: input.active }),
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
    userDisplayName: actor?.displayName ?? updatedBy,
    action: "court.updated",
    entity: "Court",
    entityId: row.id,
    metadata: { ...input },
  });

  return toCourt(row);
}

export async function softDeleteCourt(
  id: string,
  deletedBy: string,
): Promise<Court> {
  const row = await prisma.court.update({
    where: { id },
    data: {
      active: false,
      deletedAt: new Date(),
      deletedBy,
      updatedBy: deletedBy,
    },
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: deletedBy },
    select: { displayName: true },
  });
  logAudit({
    clubId: row.clubId,
    userId: deletedBy,
    userDisplayName: actor?.displayName ?? deletedBy,
    action: "court.deactivated",
    entity: "Court",
    entityId: row.id,
    metadata: { name: row.name },
  });

  return toCourt(row);
}

export async function listCourtsByClub(
  clubId: string,
  {
    includeInactive = false,
    operationalOnly = false,
  }: { includeInactive?: boolean; operationalOnly?: boolean } = {},
): Promise<Court[]> {
  const where: Prisma.CourtWhereInput = {
    clubId,
    deletedAt: null,
    ...(includeInactive ? {} : { active: true }),
    // Player deep-link protection: a clubId can be hit directly (bypassing
    // the browse-list filter in listActiveClubs), so callers that serve
    // player-facing reads must opt into this flag. Owner call sites never
    // pass it, so their own court list is unaffected by operational status.
    ...(operationalOnly ? { club: CLUB_OPERATIONAL_WHERE } : {}),
  };

  const rows = await prisma.court.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return rows.map(toCourt);
}

/**
 * Replaces the court's entire weekly template atomically: existing rows are
 * deleted and the new set is inserted in the same transaction, so a reader
 * never observes a partially-updated template.
 */
export async function setCourtAvailability(
  courtId: string,
  entries: AvailabilityEntry[],
): Promise<CourtAvailability[]> {
  return prisma.$transaction(async (tx) => {
    await tx.courtAvailability.deleteMany({ where: { courtId } });

    if (entries.length === 0) {
      return [];
    }

    await tx.courtAvailability.createMany({
      data: entries.map((entry) => ({
        courtId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
      })),
    });

    const rows = await tx.courtAvailability.findMany({
      where: { courtId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return rows.map(toCourtAvailability);
  });
}

export async function getCourtAvailability(
  courtId: string,
): Promise<CourtAvailability[]> {
  const rows = await prisma.courtAvailability.findMany({
    where: { courtId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return rows.map(toCourtAvailability);
}

export async function listClosuresByCourt(
  courtId: string,
): Promise<CourtClosure[]> {
  const rows = await prisma.courtClosure.findMany({
    where: { courtId },
    orderBy: { startsAt: "desc" },
  });
  return rows.map(toCourtClosure);
}

// Refuses to create a closure that overlaps any active reservation on this
// court — the owner cancels/reschedules those manually first (existing
// cancel-with-refund flow), then retries. No automatic cancellation here.
export async function createClosure(
  clubId: string,
  courtId: string,
  input: CreateClosureInput,
  createdBy: string,
): Promise<CourtClosure> {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  const conflicts = await prisma.reservation.findMany({
    where: {
      courtId,
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      scheduledStart: { lt: endsAt },
      scheduledEnd: { gt: startsAt },
      NOT: {
        status: "SCHEDULED",
        paymentExpiresAt: { lt: new Date() },
      },
      // Only reservations that haven't already ended count as conflicts —
      // otherwise a same-day closure ("close this court starting now") is
      // spuriously rejected by a match that was played and finished earlier
      // that same day.
      AND: { scheduledEnd: { gt: new Date() } },
    },
    select: { scheduledStart: true, scheduledEnd: true },
    orderBy: { scheduledStart: "asc" },
  });

  if (conflicts.length > 0) {
    const list = conflicts
      .map(
        (c) =>
          `${format(c.scheduledStart, "MMM d, HH:mm")}–${format(c.scheduledEnd, "HH:mm")}`,
      )
      .join(", ");
    throw new Error(
      `This closure overlaps ${conflicts.length} active reservation(s): ${list}. Cancel them first, then retry.`,
    );
  }

  const row = await prisma.courtClosure.create({
    data: { courtId, startsAt, endsAt, reason: input.reason, createdBy },
  });

  const creator = await prisma.userProfile.findUnique({
    where: { id: createdBy },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: createdBy,
    userDisplayName: creator?.displayName ?? createdBy,
    action: "court.closure_created",
    entity: "CourtClosure",
    entityId: row.id,
    metadata: { courtId, reason: input.reason },
  });

  return toCourtClosure(row);
}

export async function cancelClosure(
  clubId: string,
  courtId: string,
  closureId: string,
  cancelledBy: string,
): Promise<CourtClosure> {
  const existing = await prisma.courtClosure.findFirst({
    where: { id: closureId, courtId },
  });
  if (!existing) throw new Error("Closure not found");
  if (existing.cancelledAt) throw new Error("Closure is already cancelled");
  if (existing.endsAt <= new Date()) {
    throw new Error("Cannot cancel a closure that has already ended");
  }

  const row = await prisma.courtClosure.update({
    where: { id: closureId },
    data: { cancelledAt: new Date(), cancelledBy },
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: cancelledBy },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: cancelledBy,
    userDisplayName: actor?.displayName ?? cancelledBy,
    action: "court.closure_cancelled",
    entity: "CourtClosure",
    entityId: row.id,
    metadata: { courtId },
  });

  return toCourtClosure(row);
}

function timeToDateOnDay(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = startOfDay(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * dayOfWeek is derived from the server's local calendar day (date.getDay(),
 * 0 = Sunday .. 6 = Saturday) — the same convention CourtAvailability rows
 * are authored with. No timezone conversion is applied; callers are expected
 * to pass a Date already anchored to the club's local calendar day.
 */
export async function getCourtSlots(
  courtId: string,
  date: Date,
): Promise<Slot[]> {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { slotDurationMinutes: true },
  });
  if (!court) {
    throw new Error("Court not found");
  }

  const dayOfWeek = date.getDay();

  const availabilityRows = await prisma.courtAvailability.findMany({
    where: { courtId, dayOfWeek, active: true },
    orderBy: { startTime: "asc" },
  });

  if (availabilityRows.length === 0) {
    return [];
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      courtId,
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      scheduledStart: { gte: startOfDay(date), lte: endOfDay(date) },
      // A SCHEDULED (pending-payment) hold that's past its expiry no longer
      // blocks the slot — treated as lapsed rather than actively cancelled
      // (see docs: Payments spec, "Handled lazily").
      NOT: {
        status: "SCHEDULED",
        paymentExpiresAt: { lt: new Date() },
      },
    },
    select: { id: true, scheduledStart: true, scheduledEnd: true },
  });

  const closures = await prisma.courtClosure.findMany({
    where: {
      courtId,
      cancelledAt: null,
      startsAt: { lte: endOfDay(date) },
      endsAt: { gte: startOfDay(date) },
    },
    select: { startsAt: true, endsAt: true, reason: true },
  });

  const slots: Slot[] = [];

  for (const window of availabilityRows) {
    const windowStart = timeToDateOnDay(date, window.startTime);
    const windowEnd = timeToDateOnDay(date, window.endTime);

    let slotStart = windowStart;
    while (addMinutes(slotStart, court.slotDurationMinutes) <= windowEnd) {
      const slotEnd = addMinutes(slotStart, court.slotDurationMinutes);

      const closure = closures.find(
        (c) => c.startsAt < slotEnd && c.endsAt > slotStart,
      );
      const overlapping = reservations.find(
        (reservation) =>
          reservation.scheduledStart < slotEnd &&
          reservation.scheduledEnd > slotStart,
      );

      slots.push({
        start: slotStart,
        end: slotEnd,
        status: closure ? "closed" : overlapping ? "locked" : "free",
        ...(closure && { closureReason: closure.reason }),
        ...(!closure && overlapping && { reservationId: overlapping.id }),
      });

      slotStart = slotEnd;
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** True if any slot on any given court is free. Pure — takes each court's already-computed slots, does no DB access itself. */
export function hasAnyFreeSlot(courtSlots: Slot[][]): boolean {
  return courtSlots.some((slots) =>
    slots.some((slot) => slot.status === "free"),
  );
}

/**
 * Batched equivalent of calling getCourtSlots for every active court across
 * multiple clubs and reducing to a per-club "has any free slot" boolean —
 * used by /api/player/clubs to avoid an N+1 query pattern (previously: one
 * listCourtsByClub + 4 queries per court, per club). This does a constant
 * number of queries regardless of club/court count: one for all active
 * courts across the given clubs, one for all their availability windows on
 * this day-of-week, one for all overlapping reservations, one for all
 * overlapping closures — then reproduces getCourtSlots' exact slot-
 * generation logic in memory per court, short-circuiting a club to `true`
 * as soon as one free slot is found anywhere in it.
 */
export async function getClubsAvailability(
  clubIds: string[],
  date: Date,
): Promise<Map<string, { courtCount: number; hasAvailabilityToday: boolean }>> {
  const result = new Map<
    string,
    { courtCount: number; hasAvailabilityToday: boolean }
  >();
  for (const clubId of clubIds) {
    result.set(clubId, { courtCount: 0, hasAvailabilityToday: false });
  }

  if (clubIds.length === 0) {
    return result;
  }

  const courts = await prisma.court.findMany({
    where: { clubId: { in: clubIds }, deletedAt: null, active: true },
    select: { id: true, clubId: true, slotDurationMinutes: true },
  });

  for (const court of courts) {
    const entry = result.get(court.clubId);
    if (entry) entry.courtCount += 1;
  }

  if (courts.length === 0) {
    return result;
  }

  const courtIds = courts.map((c) => c.id);
  const dayOfWeek = date.getDay();

  const availabilityRows = await prisma.courtAvailability.findMany({
    where: { courtId: { in: courtIds }, dayOfWeek, active: true },
    orderBy: { startTime: "asc" },
  });

  const reservations = await prisma.reservation.findMany({
    where: {
      courtId: { in: courtIds },
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      scheduledStart: { gte: startOfDay(date), lte: endOfDay(date) },
      // Same lapsed-hold exception as getCourtSlots: an unpaid SCHEDULED
      // hold past its expiry no longer blocks the slot.
      NOT: {
        status: "SCHEDULED",
        paymentExpiresAt: { lt: new Date() },
      },
    },
    select: {
      id: true,
      courtId: true,
      scheduledStart: true,
      scheduledEnd: true,
    },
  });

  const closures = await prisma.courtClosure.findMany({
    where: {
      courtId: { in: courtIds },
      cancelledAt: null,
      startsAt: { lte: endOfDay(date) },
      endsAt: { gte: startOfDay(date) },
    },
    select: { courtId: true, startsAt: true, endsAt: true, reason: true },
  });

  const availabilityByCourt = new Map<string, typeof availabilityRows>();
  for (const row of availabilityRows) {
    const list = availabilityByCourt.get(row.courtId) ?? [];
    list.push(row);
    availabilityByCourt.set(row.courtId, list);
  }

  const reservationsByCourt = new Map<string, typeof reservations>();
  for (const row of reservations) {
    const list = reservationsByCourt.get(row.courtId) ?? [];
    list.push(row);
    reservationsByCourt.set(row.courtId, list);
  }

  const closuresByCourt = new Map<string, typeof closures>();
  for (const row of closures) {
    const list = closuresByCourt.get(row.courtId) ?? [];
    list.push(row);
    closuresByCourt.set(row.courtId, list);
  }

  for (const court of courts) {
    const entry = result.get(court.clubId);
    // Already confirmed available via an earlier court in this same club —
    // no need to evaluate the rest of the club's courts.
    if (!entry || entry.hasAvailabilityToday) continue;

    const windows = availabilityByCourt.get(court.id) ?? [];
    if (windows.length === 0) continue;

    const courtReservations = reservationsByCourt.get(court.id) ?? [];
    const courtClosures = closuresByCourt.get(court.id) ?? [];

    let courtHasFree = false;
    for (const window of windows) {
      const windowStart = timeToDateOnDay(date, window.startTime);
      const windowEnd = timeToDateOnDay(date, window.endTime);

      let slotStart = windowStart;
      while (addMinutes(slotStart, court.slotDurationMinutes) <= windowEnd) {
        const slotEnd = addMinutes(slotStart, court.slotDurationMinutes);

        const closed = courtClosures.some(
          (c) => c.startsAt < slotEnd && c.endsAt > slotStart,
        );
        const locked =
          !closed &&
          courtReservations.some(
            (r) => r.scheduledStart < slotEnd && r.scheduledEnd > slotStart,
          );

        if (!closed && !locked) {
          courtHasFree = true;
          break;
        }

        slotStart = slotEnd;
      }
      if (courtHasFree) break;
    }

    if (courtHasFree) {
      entry.hasAvailabilityToday = true;
    }
  }

  return result;
}

export async function getCourtById(id: string): Promise<Court | null> {
  const row = await prisma.court.findUnique({ where: { id } });
  return row ? toCourt(row) : null;
}

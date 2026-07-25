import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { startOfDay, endOfDay, addMinutes } from "date-fns";
import type {
  Court,
  CourtAvailability,
  AvailabilityEntry,
  Slot,
  CreateCourtInput,
  UpdateCourtInput,
} from "@/core/courts/types";

type CourtRow = NonNullable<
  Awaited<ReturnType<typeof prisma.court.findUnique>>
>;
type CourtAvailabilityRow = NonNullable<
  Awaited<ReturnType<typeof prisma.courtAvailability.findUnique>>
>;

const ACTIVE_RESERVATION_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

function toCourt(row: CourtRow): Court {
  return {
    id: row.id,
    clubId: row.clubId,
    name: row.name,
    surface: row.surface ?? undefined,
    indoor: row.indoor,
    color: row.color ?? undefined,
    slotDurationMinutes: row.slotDurationMinutes,
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

export async function createCourt(
  clubId: string,
  input: CreateCourtInput,
  createdBy: string,
): Promise<Court> {
  const row = await prisma.court.create({
    data: {
      clubId,
      name: input.name,
      surface: input.surface ?? null,
      indoor: input.indoor ?? false,
      color: input.color ?? null,
      ...(input.slotDurationMinutes !== undefined && {
        slotDurationMinutes: input.slotDurationMinutes,
      }),
      createdBy,
      updatedBy: createdBy,
    },
  });
  return toCourt(row);
}

export async function updateCourt(
  id: string,
  input: UpdateCourtInput,
  updatedBy: string,
): Promise<Court> {
  const row = await prisma.court.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.surface !== undefined && { surface: input.surface ?? null }),
      ...(input.indoor !== undefined && { indoor: input.indoor }),
      ...(input.color !== undefined && { color: input.color ?? null }),
      ...(input.slotDurationMinutes !== undefined && {
        slotDurationMinutes: input.slotDurationMinutes,
      }),
      ...(input.active !== undefined && { active: input.active }),
      updatedBy,
    },
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
  return toCourt(row);
}

export async function listCourtsByClub(
  clubId: string,
  { includeInactive = false }: { includeInactive?: boolean } = {},
): Promise<Court[]> {
  const where: Prisma.CourtWhereInput = {
    clubId,
    deletedAt: null,
    ...(includeInactive ? {} : { active: true }),
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
    },
    select: { id: true, scheduledStart: true, scheduledEnd: true },
  });

  const slots: Slot[] = [];

  for (const window of availabilityRows) {
    const windowStart = timeToDateOnDay(date, window.startTime);
    const windowEnd = timeToDateOnDay(date, window.endTime);

    let slotStart = windowStart;
    while (addMinutes(slotStart, court.slotDurationMinutes) <= windowEnd) {
      const slotEnd = addMinutes(slotStart, court.slotDurationMinutes);

      const overlapping = reservations.find(
        (reservation) =>
          reservation.scheduledStart < slotEnd &&
          reservation.scheduledEnd > slotStart,
      );

      slots.push({
        start: slotStart,
        end: slotEnd,
        status: overlapping ? "locked" : "free",
        ...(overlapping && { reservationId: overlapping.id }),
      });

      slotStart = slotEnd;
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

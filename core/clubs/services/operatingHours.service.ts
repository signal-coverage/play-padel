import { prisma } from "@/infrastructure/db/client";

export type ClubOperatingHoursEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type ClubOperatingHoursRow = NonNullable<
  Awaited<ReturnType<typeof prisma.clubOperatingHours.findFirst>>
>;

function toClubOperatingHoursEntry(
  row: ClubOperatingHoursRow,
): ClubOperatingHoursEntry {
  return {
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
  };
}

// A literal all-week, all-day fallback for a club that onboarded before this
// feature existed and therefore has no ClubOperatingHours rows on file — see
// resolveDefaultCourtAvailability below.
const FULL_WEEK_FALLBACK: ClubOperatingHoursEntry[] = Array.from(
  { length: 7 },
  (_, dayOfWeek) => ({ dayOfWeek, startTime: "00:00", endTime: "23:59" }),
);

export async function getClubOperatingHours(
  clubId: string,
): Promise<ClubOperatingHoursEntry[]> {
  const rows = await prisma.clubOperatingHours.findMany({
    where: { clubId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return rows.map(toClubOperatingHoursEntry);
}

/**
 * Replaces the club's entire operating-hours set atomically: existing rows
 * are deleted and the new set is inserted in the same transaction, so a
 * reader never observes a partially-updated set. Same "delete all, recreate"
 * pattern as setCourtAvailability — no partial-update semantics.
 */
export async function setClubOperatingHours(
  clubId: string,
  entries: ClubOperatingHoursEntry[],
): Promise<ClubOperatingHoursEntry[]> {
  return prisma.$transaction(async (tx) => {
    await tx.clubOperatingHours.deleteMany({ where: { clubId } });

    if (entries.length === 0) {
      return [];
    }

    await tx.clubOperatingHours.createMany({
      data: entries.map((entry) => ({
        clubId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
      })),
    });

    const rows = await tx.clubOperatingHours.findMany({
      where: { clubId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return rows.map(toClubOperatingHoursEntry);
  });
}

/**
 * Returns the entries a brand-new court should default to: the club's own
 * ClubOperatingHours if it has any, otherwise a literal all-week, all-day
 * fallback (00:00-23:59, all 7 days) for a club that onboarded before this
 * feature existed.
 */
export async function resolveDefaultCourtAvailability(
  clubId: string,
): Promise<ClubOperatingHoursEntry[]> {
  const ownHours = await getClubOperatingHours(clubId);
  return ownHours.length > 0 ? ownHours : FULL_WEEK_FALLBACK;
}

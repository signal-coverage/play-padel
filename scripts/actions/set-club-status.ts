/**
 * Sets a club's status directly — the same action the legacy
 * app/admin/club-status page exposes, and the same underlying
 * setClubStatus (core/clubs/services/clubs.service.ts) the real in-app admin
 * PATCH route calls, so the owner gets the exact same CLUB_SUSPENDED /
 * CLUB_OPERATIONAL_READY notification either way.
 *
 * DATABASE_URL is expected to already be set (scripts/menu.ts loads it from
 * the chosen .env file before calling this) — this module never picks an
 * environment on its own.
 */
import { log, withSpinner } from "../lib/prompt";
import type { ClubStatus } from "../../core/clubs/types";

export async function setClubStatusForClub(
  clubId: string,
  clubName: string,
  status: ClubStatus,
): Promise<void> {
  const { prisma } = await import("../../infrastructure/db/client");
  const { setClubStatus } =
    await import("../../core/clubs/services/clubs.service");

  try {
    const club = await withSpinner(`Setting ${clubName} to ${status}…`, () =>
      setClubStatus(clubId, status, "system:manage-cli"),
    );

    if (!club) {
      log.error(`Club ${clubId} not found.`);
      return;
    }

    log.success(`${clubName} is now ${status}.`);
  } finally {
    await prisma.$disconnect();
  }
}

import { listCourtsByClub } from "@/core/courts/services/courts.service";
import type { Court } from "@/core/courts/types";

/**
 * Ownership guard for court-scoped routes ([courtId]/**). courts.service
 * doesn't expose a getById, so this reuses listCourtsByClub (includeInactive:
 * true so a soft-deleted/inactive court still 404s cleanly instead of
 * silently vanishing) and matches by id — clubs have few enough courts that
 * this stays cheap.
 */
export async function findOwnedCourt(
  clubId: string,
  courtId: string,
): Promise<Court | null> {
  const courts = await listCourtsByClub(clubId, { includeInactive: true });
  return courts.find((court) => court.id === courtId) ?? null;
}

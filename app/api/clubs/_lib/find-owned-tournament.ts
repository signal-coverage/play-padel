import { getTournamentDetailForOwner } from "@/core/tournaments/services/tournaments.service";
import type { TournamentWithCategories } from "@/core/tournaments/types";

/**
 * Ownership guard for tournament-scoped owner routes ([tournamentId]/**) —
 * mirrors findOwnedCourt's contract (null, not a thrown error, when the
 * tournament doesn't exist or belongs to a different club).
 */
export async function findOwnedTournament(
  clubId: string,
  tournamentId: string,
): Promise<TournamentWithCategories | null> {
  return getTournamentDetailForOwner(clubId, tournamentId);
}

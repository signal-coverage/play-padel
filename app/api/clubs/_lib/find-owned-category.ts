import { getTournamentDetailForOwner } from "@/core/tournaments/services/tournaments.service";
import type { TournamentCategory } from "@/core/tournaments/types";

/**
 * Ownership guard for category-scoped owner routes ([tournamentId]/
 * categories/[categoryId]/**) — mirrors findOwnedTournament/findOwnedCourt's
 * contract (null, not a thrown error, when the tournament isn't owned by
 * this club or the category doesn't belong to that tournament).
 */
export async function findOwnedCategory(
  clubId: string,
  tournamentId: string,
  categoryId: string,
): Promise<TournamentCategory | null> {
  const tournament = await getTournamentDetailForOwner(clubId, tournamentId);
  if (!tournament) return null;

  return (
    tournament.categories.find((category) => category.id === categoryId) ?? null
  );
}

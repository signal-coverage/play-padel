import type { PlayerCandidate } from "./types";

/**
 * Client-side narrowing for player candidate lists — shared by PlayerPicker's
 * multi-select (PartnerPicker wrapper) and single-select callers. Mirrors the
 * players directory's own convention (full list fetched once, filtered
 * client-side; see app/api/players/route.ts's comment on why there's no
 * server-side search). Always excludes the signed-in user themselves.
 */
export function filterPlayerCandidates(
  players: PlayerCandidate[],
  query: string,
  excludeUserId?: string,
): PlayerCandidate[] {
  const normalizedQuery = query.trim().toLowerCase();

  return players
    .filter((player) => player.id !== excludeUserId)
    .filter((player) =>
      normalizedQuery
        ? player.displayName.toLowerCase().includes(normalizedQuery)
        : true,
    );
}

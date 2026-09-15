import type { DominantHand, PreferredSide } from "@/core/users/types";
import type { PlayerFilters, PlayerListItem, PlayerSort } from "./types";

export function filterPlayers(
  players: PlayerListItem[],
  query: string,
  filters: PlayerFilters,
): PlayerListItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return players.filter((player) => {
    if (!player.displayName.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    if (filters.category !== "all") {
      const categoryMatches =
        filters.category === "unknown"
          ? player.padelCategory === null
          : player.padelCategory === Number(filters.category);
      if (!categoryMatches) return false;
    }
    if (
      filters.preferredSide !== "all" &&
      player.preferredSide !== filters.preferredSide
    ) {
      return false;
    }
    if (
      filters.dominantHand !== "all" &&
      player.dominantHand !== filters.dominantHand
    ) {
      return false;
    }
    return true;
  });
}

// Nulls always sort last, regardless of asc/desc — `direction` only ever
// flips the ordering among non-null values.
function compareWithNullsLast<T>(
  a: T | null,
  b: T | null,
  compare: (a: T, b: T) => number,
  direction: "asc" | "desc",
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const result = compare(a, b);
  return direction === "asc" ? result : -result;
}

export function sortPlayers(
  players: PlayerListItem[],
  sort: PlayerSort,
): PlayerListItem[] {
  return [...players].sort((a, b) => {
    switch (sort.field) {
      case "name": {
        const result = a.displayName.localeCompare(b.displayName);
        return sort.direction === "asc" ? result : -result;
      }
      case "category":
        return compareWithNullsLast(
          a.padelCategory,
          b.padelCategory,
          (x, y) => x - y,
          sort.direction,
        );
      // Sorts by the raw enum value rather than its translated label: this
      // is a plain util with no access to next-intl's `t` (see
      // core/users/consts.ts's getPreferredSideLabel/getDominantHandLabel,
      // which now require one). "forehand"/"backhand" and "right"/"left"
      // sort in the same relative order as their English or Spanish labels
      // either way, since each pair's raw values are already alphabetically
      // distinct in the same order as the labels they represent.
      case "preferredSide":
        return compareWithNullsLast<PreferredSide>(
          a.preferredSide,
          b.preferredSide,
          (x, y) => x.localeCompare(y),
          sort.direction,
        );
      case "dominantHand":
        return compareWithNullsLast<DominantHand>(
          a.dominantHand,
          b.dominantHand,
          (x, y) => x.localeCompare(y),
          sort.direction,
        );
    }
  });
}

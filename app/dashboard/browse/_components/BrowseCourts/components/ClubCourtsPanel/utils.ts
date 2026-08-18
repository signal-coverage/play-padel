import type { CourtColumn } from "@/components/CourtAvailabilityGrid";

export type CourtFilters = {
  surface: string; // "all" | the exact surface value to match
  indoor: "all" | "indoor" | "outdoor";
  color: string; // "all" | the exact color value to match
};

export type CourtSortField = "name" | "surface" | "reservationFee";
export type CourtSort = { field: CourtSortField; direction: "asc" | "desc" };

export function filterCourts(
  courts: CourtColumn[],
  filters: CourtFilters,
): CourtColumn[] {
  return courts.filter((court) => {
    if (filters.surface !== "all" && court.surface !== filters.surface) {
      return false;
    }
    if (filters.indoor !== "all") {
      const isIndoor = court.indoor === true;
      if (filters.indoor === "indoor" && !isIndoor) return false;
      if (filters.indoor === "outdoor" && isIndoor) return false;
    }
    if (filters.color !== "all" && court.color !== filters.color) {
      return false;
    }
    return true;
  });
}

// Undefined always sorts last, regardless of asc/desc — matches the same
// convention used in Players Directory's sortPlayers (see
// app/dashboard/players/_components/PlayersDirectory/utils.ts).
function compareWithUndefinedLast<T>(
  a: T | undefined,
  b: T | undefined,
  compare: (a: T, b: T) => number,
  direction: "asc" | "desc",
): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  const result = compare(a, b);
  return direction === "asc" ? result : -result;
}

export function sortCourts(
  courts: CourtColumn[],
  sort: CourtSort,
): CourtColumn[] {
  return [...courts].sort((a, b) => {
    switch (sort.field) {
      case "name": {
        const result = a.name.localeCompare(b.name);
        return sort.direction === "asc" ? result : -result;
      }
      case "surface":
        return compareWithUndefinedLast(
          a.surface,
          b.surface,
          (x, y) => x.localeCompare(y),
          sort.direction,
        );
      case "reservationFee":
        return compareWithUndefinedLast(
          a.reservationFee,
          b.reservationFee,
          (x, y) => x - y,
          sort.direction,
        );
    }
  });
}

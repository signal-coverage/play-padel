import type { ClubBrowseSummary } from "../../types";

export type ClubSortField = "name" | "courtCount";
export type ClubSort = { field: ClubSortField; direction: "asc" | "desc" };

export function filterClubs(
  clubs: ClubBrowseSummary[],
  query: string,
): ClubBrowseSummary[] {
  const normalizedQuery = query.trim().toLowerCase();
  return clubs.filter((club) =>
    club.name.toLowerCase().includes(normalizedQuery),
  );
}

function compareBySort(
  a: ClubBrowseSummary,
  b: ClubBrowseSummary,
  sort: ClubSort,
): number {
  const result =
    sort.field === "name"
      ? a.name.localeCompare(b.name)
      : a.courtCount - b.courtCount;
  return sort.direction === "asc" ? result : -result;
}

// Unavailable clubs always sink to the bottom (sorted by name); `sort` only reorders the available ones above them.
export function sortClubs(
  clubs: ClubBrowseSummary[],
  sort: ClubSort,
): ClubBrowseSummary[] {
  const available = clubs.filter((club) => club.hasAvailabilityToday);
  const unavailable = clubs.filter((club) => !club.hasAvailabilityToday);

  return [
    ...available.sort((a, b) => compareBySort(a, b, sort)),
    ...unavailable.sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

export const myReservationsBaseKey = ["player", "my-reservations"] as const;

export function myReservationsQueryKey(includePast: boolean) {
  return [...myReservationsBaseKey, includePast] as const;
}

/** Number of placeholder rows shown while reservations are loading (see CourtsTable/ReservationsTable). */
export const LOADING_SKELETON_ROW_COUNT = 3;

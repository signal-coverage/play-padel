export const myReservationsBaseKey = ["player", "my-reservations"] as const;

export function myReservationsQueryKey(includePast: boolean) {
  return [...myReservationsBaseKey, includePast] as const;
}

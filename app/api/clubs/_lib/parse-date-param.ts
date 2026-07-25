/**
 * Parses a "YYYY-MM-DD" query param into a Date anchored to local midnight of
 * that calendar day. Matches the convention courts.service's getCourtSlots
 * and reservations.service's listReservationsByClub already rely on
 * (date.getDay() / startOfDay / endOfDay against the server's local
 * timezone — no per-club timezone conversion at this MVP stage). Returns
 * null when the value is missing or malformed so callers can 400 cleanly.
 */
export function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

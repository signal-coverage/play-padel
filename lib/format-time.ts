/**
 * Explicit, timezone-aware date/time formatting shared by every screen that
 * displays a reservation or slot.
 *
 * `Date.prototype.toLocaleString()` / `toLocaleTimeString()` called with no
 * arguments resolve locale and hour-cycle from the server process's OS/ICU
 * defaults, not the club's configured timezone. On a machine whose default
 * `Intl` locale renders a 12-hour clock without an AM/PM designator (e.g.
 * `es-AR`), a 17:00 reservation prints as "05:00:00" - silently 12 hours off
 * - even though the underlying UTC instant is correct. Always pass an
 * explicit locale, an explicit `hour12: false`, and the club's IANA
 * timezone so rendering is deterministic across every environment.
 */

const DATE_FORMAT_LOCALE = "en-CA"; // yields YYYY-MM-DD ordering
const TIME_FORMAT_LOCALE = "en-GB"; // 24-hour clock by default, reinforced below

/** Returns `YYYY-MM-DD` for `date` as rendered in `timeZone`. */
export function formatDateInTz(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat(DATE_FORMAT_LOCALE, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Returns `HH:mm` for `date` as rendered in `timeZone`, always 24-hour. */
export function formatTimeInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(TIME_FORMAT_LOCALE, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Returns `HH:mm - HH:mm` for a `[start, end)` range, both in `timeZone`. */
export function formatTimeRangeInTz(
  start: Date,
  end: Date,
  timeZone: string
): string {
  return `${formatTimeInTz(start, timeZone)} - ${formatTimeInTz(end, timeZone)}`;
}

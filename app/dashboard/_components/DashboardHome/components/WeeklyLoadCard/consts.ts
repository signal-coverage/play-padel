// Stable identifiers (never rendered directly) — components look these up
// under the shared "Weekday" translation namespace's "short"/"full" keys
// (see OwnerWeeklyLoad.tsx/PlayerWeeklyLoad.tsx) to get locale-appropriate
// display text instead.
export const WEEKDAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

/** Owner: sum booking volume per weekday over the trailing 4 weeks. */
export const OWNER_LOAD_RANGE_DAYS = 28;

/** Player: bucket play history by weekday over the trailing 8 weeks. */
export const PLAYER_LOAD_RANGE_WEEKS = 8;

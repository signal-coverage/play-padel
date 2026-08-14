export const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/** Owner: sum booking volume per weekday over the trailing 4 weeks. */
export const OWNER_LOAD_RANGE_DAYS = 28;

/** Player: bucket play history by weekday over the trailing 8 weeks. */
export const PLAYER_LOAD_RANGE_WEEKS = 8;

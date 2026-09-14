// Ordered to match an owner's real lifecycle: set up the club, clear the
// gate that unlocks the dashboard, then day-to-day operation (courts,
// reservations, settings, tournaments).
export const OWNER_HELP_ITEM_KEYS = [
  "onboarding",
  "gate",
  "courts",
  "reservations",
  "clubSettings",
  "tournaments",
] as const;

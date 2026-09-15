// Ordered to match the natural order a player would encounter these flows:
// find a club/court, book it (and pay if required), manage what they've
// booked, then the more occasional actions (tournaments, profile, directory).
export const PLAYER_HELP_ITEM_KEYS = [
  "browsing",
  "booking",
  "myReservations",
  "tournaments",
  "profile",
  "playersDirectory",
] as const;

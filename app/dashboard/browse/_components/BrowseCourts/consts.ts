export const playerClubsQueryKey = ["player", "clubs"] as const;

export const playerClubAvailabilityBaseKey = [
  "player",
  "club-availability",
] as const;

export function playerClubAvailabilityQueryKey(clubId: string, dateKey: string) {
  return [...playerClubAvailabilityBaseKey, clubId, dateKey] as const;
}

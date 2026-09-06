import { CLUB_HEALTH_ISSUE_MESSAGES } from "./consts";
import type { AdminClubListItem } from "../../types";

/**
 * Combined, comma-joined health warning message for a club, or null when
 * none of the health flags on AdminClubListItem apply. Backs the warning
 * icon's tooltip/title in AdminClubList.
 */
export function getClubHealthWarning(club: AdminClubListItem): string | null {
  const issues = (
    Object.keys(CLUB_HEALTH_ISSUE_MESSAGES) as Array<
      keyof typeof CLUB_HEALTH_ISSUE_MESSAGES
    >
  )
    .filter((flag) => club[flag])
    .map((flag) => CLUB_HEALTH_ISSUE_MESSAGES[flag]);

  return issues.length > 0 ? issues.join(", ") : null;
}

/** How many of the given clubs have at least one health issue flagged. */
export function countClubsNeedingAttention(clubs: AdminClubListItem[]): number {
  return clubs.filter((club) => getClubHealthWarning(club) !== null).length;
}

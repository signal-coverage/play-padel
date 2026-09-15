import { CLUB_HEALTH_ISSUE_FLAGS } from "./consts";
import type { AdminClubListItem } from "../../types";

export type ClubHealthIssueMessages = Record<
  (typeof CLUB_HEALTH_ISSUE_FLAGS)[number],
  string
>;

/**
 * Combined, comma-joined health warning message for a club, or null when
 * none of the health flags on AdminClubListItem apply. Backs the warning
 * icon's tooltip/title in AdminClubList. `messages` comes from the caller's
 * own useTranslations("AdminClubList") result (this is a plain util, not a
 * component, so it can't call useTranslations itself).
 */
export function getClubHealthWarning(
  club: AdminClubListItem,
  messages: ClubHealthIssueMessages,
): string | null {
  const issues = CLUB_HEALTH_ISSUE_FLAGS.filter((flag) => club[flag]).map(
    (flag) => messages[flag],
  );

  return issues.length > 0 ? issues.join(", ") : null;
}

/** How many of the given clubs have at least one health issue flagged. */
export function countClubsNeedingAttention(
  clubs: AdminClubListItem[],
  messages: ClubHealthIssueMessages,
): number {
  return clubs.filter((club) => getClubHealthWarning(club, messages) !== null)
    .length;
}

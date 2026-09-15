import type { ClubStatus } from "@/core/clubs/types";

// Mirrors CourtsTable's Active/Inactive badge convention (see
// CourtsTable.tsx's "status" column) — SUSPENDED/DISABLED read as
// destructive, ACTIVE as the primary "default" variant, INACTIVE as neutral.
export const CLUB_STATUS_BADGE_VARIANT: Record<
  ClubStatus,
  "default" | "secondary" | "destructive"
> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
  DISABLED: "destructive",
};

// The "club health" flags on AdminClubListItem, in the order their messages
// are joined when multiple apply — see core/clubs/services/clubs.service.ts's
// listAllClubs for how each flag is computed. The actual user-facing message
// for each flag lives in the messages/*.json "AdminClubList" namespace (this
// is a plain data file, so it can't call useTranslations() itself) —
// AdminClubList.tsx builds a { flag: message } map from its own
// useTranslations() result and passes it into getClubHealthWarning /
// countClubsNeedingAttention below.
export const CLUB_HEALTH_ISSUE_FLAGS = [
  "mpTokenIssue",
  "membershipPastDue",
  "noOperatingHours",
] as const;

// Local copy of AdminClubList/consts.ts's CLUB_STATUS_BADGE_VARIANT — not
// imported across sibling component folders, per this repo's SRP-per-folder
// convention (see AdminSearchView/types.ts's header comment for the same
// rationale).
export const CLUB_STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
  DISABLED: "destructive",
};

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

// User-facing messages for each "club health" flag on AdminClubListItem —
// see core/clubs/services/clubs.service.ts's listAllClubs for how these are
// computed. Order here is the order they're joined in when multiple apply.
export const CLUB_HEALTH_ISSUE_MESSAGES = {
  mpTokenIssue: "Mercado Pago token expired",
  membershipPastDue: "Membership past due",
  noOperatingHours: "No operating hours configured",
} as const;

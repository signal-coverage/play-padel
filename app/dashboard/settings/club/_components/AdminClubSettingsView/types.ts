import type { ClubStatus, Plan } from "@/core/clubs/types";

// Mirrors core/clubs/services/clubs.service.ts's AdminClubListItem — the
// shape GET /api/admin/clubs returns. Kept as a local, duck-typed copy (not
// imported across the API/UI boundary) per this repo's SRP-per-folder
// convention.
export type AdminClubListItem = {
  id: string;
  name: string;
  status: ClubStatus;
  plan: Plan;
  courtLimit: number | null;
  mpTokenIssue: boolean;
  membershipPastDue: boolean;
  noOperatingHours: boolean;
  isFreePlan: boolean;
};

// Mirrors the `owner` field GET /api/admin/clubs/[clubId] now returns
// alongside `club` (see core/clubs/services/clubs.service.ts's
// getClubOwner) — null when the club has no owner-role UserProfile row.
export type ClubOwner = {
  id: string;
  displayName: string;
};

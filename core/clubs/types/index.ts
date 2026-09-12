// "FREE" is a hidden, admin-only tier — never exposed to real club owners.
// See components/PlanSelectionModal/consts.ts's PLAN_ORDER, the only place
// that drives the visible plan picker: it deliberately omits "FREE" so no
// real customer can ever select it. Activated only via
// core/billing/services/membership.service.ts's `activateFreePlan`, through
// the internal app/admin/club-status page.
export type Plan = "BASIC" | "PRO" | "PLUS" | "MAX" | "FREE";
export type ClubStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DISABLED";
// Mirrors prisma/schema.prisma's ClubApprovalStatus enum. Schema default is
// APPROVED (not PENDING) so every pre-existing club is grandfathered in —
// see that enum's own doc comment. Only the onboarding club-creation path
// (app/api/onboarding/route.ts) ever passes "PENDING" explicitly.
export type ClubApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

// Summary shape for the admin approval queue (GET /api/admin/clubs/pending)
// — deliberately narrow (not the full `Club` shape) since the queue only
// ever needs enough to let an admin decide whether to approve/reject.
export interface PendingClubSummary {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  // True when another club (any approval/operational status, address text
  // compared case/whitespace-insensitively) shares this club's email or
  // address — see listPendingClubs in core/clubs/services/clubs.service.ts.
  // A warning surfaced for the admin to judge during review, never an
  // automatic rejection: address text isn't normalized/geocoded, so this
  // can't distinguish a real duplicate from two different addresses that
  // happen to be typed the same way.
  possibleDuplicate: boolean;
}

export interface Club {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zipCode?: string;
  // A club never has its own independently-editable logo/photo — everywhere
  // a "club photo" is shown, it's always the club owner's own Clerk-synced
  // profile photo (see core/users/services/users.service.ts's
  // syncUserProfileFromClerk). Populated by listActiveClubs/getClubOwner via
  // a batched UserProfile lookup, never written directly on Club.
  ownerPhotoUrl?: string | null;
  timezone: string;
  currency: string;
  plan: Plan;
  // Per-club override of the plan's default court limit — see
  // lib/consts/planPricing.ts's PLAN_COURT_LIMITS and prisma/schema.prisma's
  // Club.courtLimit doc comment. Null/undefined means "use the plan's
  // default (or unlimited, for MAX with nothing set yet)".
  courtLimit?: number | null;
  status: ClubStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CreateClubInput {
  name: string;
  email: string;
  timezone: string;
  currency: string;
  legalName?: string;
  taxId?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zipCode?: string;
  plan?: Plan;
  // Optional override of the schema's own @default(APPROVED) — passed only
  // by the onboarding club-creation call site (with "PENDING"). Every other
  // caller omits this so the column default applies unchanged.
  approvalStatus?: ClubApprovalStatus;
}

export interface UpdateClubInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zipCode?: string;
  timezone?: string;
  currency?: string;
  plan?: Plan;
  // Admin-only in practice — see require-owner's PATCH /api/clubs, which
  // strips this before calling updateClub so an owner can never set their
  // own override.
  courtLimit?: number | null;
  status?: ClubStatus;
}

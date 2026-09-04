// "FREE" is a hidden, admin-only tier — never exposed to real club owners.
// See components/PlanSelectionModal/consts.ts's PLAN_ORDER, the only place
// that drives the visible plan picker: it deliberately omits "FREE" so no
// real customer can ever select it. Activated only via
// core/billing/services/membership.service.ts's `activateFreePlan`, through
// the internal app/admin/club-status page.
export type Plan = "BASIC" | "PRO" | "PLUS" | "MAX" | "FREE";
export type ClubStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DISABLED";

export interface Club {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zipCode?: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  plan: Plan;
  status: ClubStatus;
  requiresPrepayment: boolean;
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
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zipCode?: string;
  logoUrl?: string;
  plan?: Plan;
}

export interface UpdateClubInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zipCode?: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
  plan?: Plan;
  status?: ClubStatus;
  requiresPrepayment?: boolean;
}

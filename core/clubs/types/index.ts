export type Plan = "FREE" | "BASIC" | "PRO" | "CUSTOM";
export type ClubStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DISABLED";

export interface Club {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  plan: Plan;
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
  logoUrl?: string;
  plan?: Plan;
}

export interface UpdateClubInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
  plan?: Plan;
  status?: ClubStatus;
}

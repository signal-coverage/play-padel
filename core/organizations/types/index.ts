export type OrganizationStatus =
  "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DISABLED";
export const PLAN_VALUES = [
  "FREE",
  "CONSULTING_ROOM",
  "MEDICAL_CENTER",
  "HOSPITAL",
  "CUSTOM",
] as const;
export type Plan = (typeof PLAN_VALUES)[number];

export interface Organization {
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
  status: OrganizationStatus;
  enabledPlugins: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

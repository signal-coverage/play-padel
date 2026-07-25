import type { Plan, ClubStatus } from "@/core/clubs/types";

export const PLAN_LABEL: Record<Plan, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PRO: "Pro",
  CUSTOM: "Custom",
};

export const CLUB_STATUS_LABEL: Record<ClubStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  DISABLED: "Disabled",
};

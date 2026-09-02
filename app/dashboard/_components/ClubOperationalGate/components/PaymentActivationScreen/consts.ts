import type { MembershipStatusValue } from "@/core/billing/services/membership.service";

// Human-readable labels for the membership status summary shown above the
// "Pay Membership"/"Membership Active" action.
export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatusValue, string> = {
  PENDING: "Awaiting payment",
  TRIALING: "Free trial",
  ACTIVE: "Active",
  PAST_DUE: "Payment past due",
  CANCELLED: "Cancelled",
};

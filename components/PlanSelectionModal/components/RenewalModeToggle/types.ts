import type { MembershipRenewalModeValue } from "@/core/billing/services/membership.service";

export type RenewalModeToggleProps = {
  value: MembershipRenewalModeValue;
  onChange: (value: MembershipRenewalModeValue) => void;
};

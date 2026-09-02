import type { Plan } from "@/core/clubs/types";
import type {
  MembershipCycleValue,
  MembershipRenewalModeValue,
  MembershipStatusValue,
} from "@/core/billing/services/membership.service";

export type { MembershipCycleValue, MembershipRenewalModeValue };

// Client-side projection of the GET /api/clubs/membership response — only
// the fields this modal actually reads. Kept local per this repo's
// SRP-per-folder convention rather than importing the server-only
// `MembershipSubscriptionSnapshot` type (which carries Date fields that
// arrive as JSON strings over the wire).
export type MembershipSubscriptionResponse = {
  id: string;
  clubId: string;
  plan: Plan;
  pendingPlan: Plan | null;
  cycle: MembershipCycleValue;
  pendingCycle: MembershipCycleValue | null;
  renewalMode: MembershipRenewalModeValue;
  status: MembershipStatusValue;
  currency: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

// Local copy of BillingCycleToggle/types.ts's `BillingCycle` union — same
// SRP-per-folder reasoning as
// PaymentActivationScreen/components/PlanOptionCard/types.ts's own local
// copy of the same union.
export type BillingCycle = "monthly" | "annual";

export function toCycleValue(cycle: BillingCycle): MembershipCycleValue {
  return cycle === "annual" ? "ANNUAL" : "MONTHLY";
}

// Steps the modal can be showing. `null` local step means "let the server
// snapshot decide" (loading/error/confirmed/select) — see utils.ts's
// `resolveServerStep`. Once the owner starts a checkout attempt, a local
// step ("collect-card" or "awaiting-confirmation") takes over regardless of
// what the server snapshot says, until either an error resets it back to
// `null` or the subscription is confirmed (which always wins, per spec's
// "Webhook-Only State Confirmation" — no client step can fake a confirmed
// state).
export type ServerStep = "loading" | "error" | "confirmed" | "select";
export type LocalStep = "collect-card" | "awaiting-confirmation";
export type ModalStep = ServerStep | LocalStep;

export type PlanSelectionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

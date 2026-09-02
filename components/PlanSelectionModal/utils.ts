import type { Plan } from "@/core/clubs/types";
import type { MembershipStatusValue } from "@/core/billing/services/membership.service";
import { PLAN_DETAILS } from "./consts";
import type {
  MembershipSubscriptionResponse,
  ServerStep,
  MembershipCycleValue,
} from "./types";

// A membership counts as "confirmed" once MP has authorized/charged it —
// TRIALING (authorized preapproval, trial running) and ACTIVE (paid) both
// unlock "Link Mercado Pago account" per spec's "Two Separate Membership
// Actions". PENDING/PAST_DUE/CANCELLED never do.
export function isMembershipConfirmed(status: MembershipStatusValue): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

export type ResolveServerStepInput = {
  isLoading: boolean;
  isError: boolean;
  subscription: MembershipSubscriptionResponse | null;
};

// Derives which server-driven step the modal should show. Loading always
// wins over stale data (e.g. a previous fetch's confirmed subscription
// showing while a refetch is in flight) so the UI never flashes a stale
// "confirmed" state as authoritative before the fresh fetch resolves.
export function resolveServerStep(input: ResolveServerStepInput): ServerStep {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  if (input.subscription && isMembershipConfirmed(input.subscription.status)) {
    return "confirmed";
  }
  return "select";
}

// Resolves the fixed price for a plan+cycle, or `null` when the tier has no
// automated price (MAX — contact-us tier, per spec's "Explicitly Not
// Covered by This Spec"). Mirrors `PLAN_DETAILS`'s own null convention.
export function resolveCheckoutAmount(
  plan: Plan,
  cycle: MembershipCycleValue,
): number | null {
  const details = PLAN_DETAILS[plan];
  return cycle === "MONTHLY" ? details.monthlyPrice : details.annualPrice;
}

// Whether a plan can go through the automated checkout at all, independent
// of cycle — mirrors the server route's own MAX rejection
// (app/api/clubs/membership/route.ts) so the UI never lets an owner attempt
// a checkout the server will 400 on.
export function isAutomatedCheckoutAvailable(plan: Plan): boolean {
  const details = PLAN_DETAILS[plan];
  return details.monthlyPrice !== null || details.annualPrice !== null;
}

// Only reached after Mercado Pago's own Brick has ALREADY tokenized the
// card successfully — this is OUR backend (`POST /api/clubs/membership`)
// rejecting that token, something the Brick has no visibility into and
// can't show anything for (unlike its own client-side validation errors,
// which it already renders itself — see MembershipCheckoutDrawer.tsx).
// This modal is only ever shown to a club OWNER managing their own club's
// billing (PaymentActivationScreen, UpgradeMembershipButton — both
// dashboard-only, never player-facing), so a backend failure here is
// Play Padel's own platform breaking, not something the owner or their
// club can self-diagnose — "contact support" points at Play Padel, same
// wording CardTokenForm.tsx already uses for its own unrecoverable
// (missing public key) error.
export function resolveCheckoutErrorMessage(rawMessage: string): string {
  return `${rawMessage} If this keeps happening, contact support.`;
}

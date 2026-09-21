import type { Plan } from "@/core/clubs/types";
import type { MembershipRenewalModeValue } from "@/core/billing/services/membership.service";
import type { BillingCycle } from "./types";

// Plan pricing/marketing data lives in lib/consts/planPricing.ts, shared
// with PaymentActivationScreen/components/PlanOptionCard so the real pricing
// data never drifts between the two places it's shown. Re-exported here so
// this component
// keeps importing from a local, folder-scoped path per the SRP-per-folder
// convention, instead of reaching into lib/consts directly from the .tsx.
export { PLAN_DETAILS } from "@/lib/consts/planPricing";

export const PLAN_ORDER: Plan[] = ["BASIC", "PRO", "PLUS", "MAX"];

// Labels/descriptions are looked up via useTranslations in each option's own
// component (BillingCycleToggle/RenewalModeToggle) — these arrays only carry
// the values, same convention as CourtFormSheet's COURT_SURFACE_OPTIONS.
export const BILLING_CYCLE_OPTIONS: { value: BillingCycle }[] = [
  { value: "monthly" },
  { value: "annual" },
];

export const RENEWAL_MODE_OPTIONS: {
  value: MembershipRenewalModeValue;
}[] = [{ value: "AUTO" }, { value: "MANUAL" }];

// Same TanStack Query key convention as CLUB_PLAN_QUERY_KEY /
// MERCADOPAGO_STATUS_QUERY_KEY — sharing this key across every consumer of
// `useMembershipSubscription` (PaymentActivationScreen, DashboardHome's
// UpgradeMembershipButton, and this modal itself) means they all read from
// one cached fetch instead of firing independent requests when mounted
// together.
export const MEMBERSHIP_SUBSCRIPTION_QUERY_KEY = [
  "clubs",
  "membership",
] as const;

// Polling cadence while awaiting webhook confirmation (either cycle's
// no-trial preapproval waiting on its first charge webhook) — frequent
// enough to feel responsive, not so frequent it hammers the route.
export const AWAITING_CONFIRMATION_POLL_INTERVAL_MS = 4000;

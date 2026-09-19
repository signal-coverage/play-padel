// Pure billing-cycle helpers with ZERO other imports — deliberately kept
// dependency-free (no prisma, no PLAN_DETAILS) so both
// lib/mercadopago/preapprovalPlans.ts and
// lib/mercadopago/membershipPreapprovals.ts can share the exact same
// frequency mapping without either pulling in the other's (or prisma's)
// module graph. A version of this that lived inside preapprovalPlans.ts
// transitively required a live DATABASE_URL just to import it in tests,
// since that file also imports the prisma client at module scope.

export type MembershipCycleValue = "MONTHLY" | "ANNUAL";

// Both cycles are real recurring Mercado Pago subscriptions — ANNUAL is
// just a MONTHLY-shaped preapproval_plan billed every 12 months instead of
// every 1 (confirmed accepted by a live Mercado Pago sandbox call: MP has no
// dedicated "years" frequency_type, only "days"/"months").
export function resolveAutoRecurringFrequency(cycle: MembershipCycleValue): {
  frequency: number;
  frequency_type: "months";
} {
  return { frequency: cycle === "MONTHLY" ? 1 : 12, frequency_type: "months" };
}

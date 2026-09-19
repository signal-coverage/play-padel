// Pure billing-cycle helpers with ZERO other imports — deliberately kept
// dependency-free (no prisma, no PLAN_DETAILS) so both
// lib/mercadopago/preapprovalPlans.ts and
// lib/mercadopago/membershipPreapprovals.ts can share the exact same
// frequency mapping without either pulling in the other's (or prisma's)
// module graph. A version of this that lived inside preapprovalPlans.ts
// transitively required a live DATABASE_URL just to import it in tests,
// since that file also imports the prisma client at module scope.

export type MembershipCycleValue = "MONTHLY" | "ANNUAL";

/**
 * Maps a membership cycle to Mercado Pago's monthly recurrence shape:
 * monthly plans recur every month and annual plans every 12 months.
 */
export function resolveAutoRecurringFrequency(cycle: MembershipCycleValue): {
  frequency: number;
  frequency_type: "months";
} {
  return { frequency: cycle === "MONTHLY" ? 1 : 12, frequency_type: "months" };
}

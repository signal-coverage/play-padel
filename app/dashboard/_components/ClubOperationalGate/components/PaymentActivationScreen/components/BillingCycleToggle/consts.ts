import type { BillingCycle } from "./types";

// Mirrors PlanStep.tsx's BILLING_CYCLE_OPTIONS — same pill-toggle visual
// language, kept as a local copy per this repo's SRP-per-folder convention
// rather than imported across feature folders.
export const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

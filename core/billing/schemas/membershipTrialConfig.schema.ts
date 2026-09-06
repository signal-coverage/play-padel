import { z } from "zod";

// Mirrors `MembershipTrialConfig` (prisma/schema.prisma) — the admin-facing
// override for a plan tier's free-trial length. See spec's "Admin-
// Configurable Trial Length Per Plan" and design.md's "Admin trial-length
// override" decision. `updatedBy` is deliberately NOT part of this input:
// the route now has a real Clerk-based admin gate and derives the actor
// from the authenticated session, not from the request body.
export const updateMembershipTrialConfigSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]),
  trialDays: z.number().int().min(0, "trialDays must be zero or greater"),
});

export type UpdateMembershipTrialConfigInput = z.infer<
  typeof updateMembershipTrialConfigSchema
>;

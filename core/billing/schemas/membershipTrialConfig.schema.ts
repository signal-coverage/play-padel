import { z } from "zod";

// Mirrors `MembershipTrialConfig` (prisma/schema.prisma) — the admin-facing
// override for a plan tier's free-trial length. See spec's "Admin-
// Configurable Trial Length Per Plan" and design.md's "Admin trial-length
// override" decision (static-secret-guarded route, no dedicated admin role).
export const updateMembershipTrialConfigSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]),
  trialDays: z.number().int().min(0, "trialDays must be zero or greater"),
  mpPreapprovalPlanId: z.string().optional().nullable(),
  // No admin-role auth exists yet (explicitly out of scope for this slice —
  // see design.md) — the caller must self-identify here for auditing.
  updatedBy: z.string().min(1, "updatedBy is required"),
});

export type UpdateMembershipTrialConfigInput = z.infer<
  typeof updateMembershipTrialConfigSchema
>;

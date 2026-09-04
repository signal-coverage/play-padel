import { z } from "zod";

// Admin-facing body for POST /api/admin/membership-free-plan — same
// static-secret-guarded, no-admin-role convention as the sibling
// core/clubs/schemas/clubStatus.schema.ts and
// core/billing/schemas/membershipTrialConfig.schema.ts. `force` overrides
// activateFreePlan's safety guard against overwriting a subscription that
// already has a real Mercado Pago preapproval/preference id.
export const activateFreePlanSchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
  force: z.boolean().optional(),
});

export type ActivateFreePlanRequestInput = z.infer<
  typeof activateFreePlanSchema
>;

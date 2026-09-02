import { z } from "zod";

// Mirrors `Club.status` (prisma/schema.prisma) — the admin-facing manual
// override for a club's operational status. See
// core/billing/schemas/membershipTrialConfig.schema.ts for the sibling
// admin-facing schema this one mirrors (static-secret-guarded route, no
// dedicated admin role).
export const updateClubStatusSchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DISABLED"]),
  // No admin-role auth exists yet (explicitly out of scope — see the sibling
  // membershipTrialConfig.schema.ts) — the caller must self-identify here
  // for auditing, since it is stored directly on `Club.updatedBy`.
  updatedBy: z.string().min(1, "updatedBy is required"),
});

export type UpdateClubStatusInput = z.infer<typeof updateClubStatusSchema>;

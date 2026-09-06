import { z } from "zod";

// Mirrors `Club.status` (prisma/schema.prisma) — the admin-facing manual
// override for a club's operational status. `updatedBy` is deliberately NOT
// part of this input: the route now has a real Clerk-based admin gate and
// derives the actor from the authenticated session, not from the request
// body — trusting a client-supplied identity here would let any admin
// misattribute a status change to someone else.
export const updateClubStatusSchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DISABLED"]),
});

export type UpdateClubStatusInput = z.infer<typeof updateClubStatusSchema>;

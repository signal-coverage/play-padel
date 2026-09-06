import { z } from "zod";

// Validates the body of POST /api/admin/impersonate — the only input an
// admin supplies is the userId of the UserProfile they want to sign in as.
export const impersonateUserSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

export type ImpersonateUserInput = z.infer<typeof impersonateUserSchema>;

// Validates the body of POST /api/admin/impersonate/revoke.
export const revokeImpersonationSchema = z.object({
  actorTokenId: z.string().min(1, "actorTokenId is required"),
});

export type RevokeImpersonationInput = z.infer<
  typeof revokeImpersonationSchema
>;

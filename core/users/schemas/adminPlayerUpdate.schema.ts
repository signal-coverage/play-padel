import { z } from "zod";

// Validates the body of PATCH /api/admin/players/[userId] — the fields an
// admin may edit on a player's UserProfile. Every field is optional (a
// partial update via core/users/services/users.service.ts's
// updateUserProfile), but each one that IS present must be well-formed.
// Mirrors the exact PreferredSide/DominantHand enum values and the
// Argentine 1-8 padel category range from core/users/types and
// core/users/consts.ts (padelCategory's "unknown" option there maps to
// null before it ever reaches this schema).
export const adminUpdatePlayerSchema = z.object({
  displayName: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Enter a valid email").optional(),
  phone: z.string().min(1, "Phone is required").optional().nullable(),
  padelCategory: z
    .number()
    .int()
    .min(1, "Category must be between 1 and 8")
    .max(8, "Category must be between 1 and 8")
    .optional()
    .nullable(),
  preferredSide: z.enum(["forehand", "backhand"]).optional().nullable(),
  dominantHand: z.enum(["right", "left"]).optional().nullable(),
});

export type AdminUpdatePlayerInput = z.infer<typeof adminUpdatePlayerSchema>;

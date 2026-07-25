import { z } from "zod";

export const updateUserProfileSchema = z.object({
  roleId: z.enum(["admin", "staff", "professional"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  displayName: z.string().min(1).optional(),
  phone: z.string().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

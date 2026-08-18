import { z } from "zod";

export const createClubSchema = z.object({
  name: z.string().min(1, "Club name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required"),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  logoUrl: z
    .union([z.literal(""), z.string().url("Must be a valid URL")])
    .optional(),
  plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]).optional(),
});

export const updateClubSchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  logoUrl: z
    .union([z.literal(""), z.string().url("Must be a valid URL")])
    .optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DISABLED"]).optional(),
  requiresPrepayment: z.boolean().optional(),
});

export type CreateClubSchemaInput = z.infer<typeof createClubSchema>;
export type UpdateClubSchemaInput = z.infer<typeof updateClubSchema>;

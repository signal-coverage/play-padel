import { z } from "zod";

// Optional at both create and update: empty/omitted is always allowed, but a
// provided value must contain a realistic amount of actual digits — a
// PhoneField can otherwise produce e.g. "+54" (country code, zero real
// digits), which is truthy but not a usable WhatsApp number. This is the real
// server-side gate; the client-side schemas (onboarding, ClubSettingsView)
// mirror the same >= 8 digit rule for inline validation only.
const whatsappNumberSchema = z
  .string()
  .optional()
  .refine(
    (value) => !value || value.replace(/\D/g, "").length >= 8,
    "Enter a valid WhatsApp number",
  );

export const createClubSchema = z.object({
  name: z.string().min(1, "Club name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required"),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: whatsappNumberSchema,
  address: z.string().optional(),
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]).optional(),
});

export const updateClubSchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  whatsappNumber: whatsappNumberSchema,
  address: z.string().optional(),
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]).optional(),
  // Admin-only in practice — PATCH /api/clubs (owner route) strips this
  // before calling updateClub, so only the admin route ever forwards it.
  courtLimit: z.number().int().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DISABLED"]).optional(),
});

export type CreateClubSchemaInput = z.infer<typeof createClubSchema>;
export type UpdateClubSchemaInput = z.infer<typeof updateClubSchema>;

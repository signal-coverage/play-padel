import { z } from "zod";

// Mirrors core/clubs/schemas/club.schema.ts's updateClubSchema for the fields
// this form edits. The server-side schema remains the source of truth — this
// only drives inline field validation on the client.
export const clubSettingsFormSchema = z.object({
  name: z.string().min(1, "Club name is required"),
  legalName: z.string(),
  taxId: z.string(),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z.string(),
  // Optional field: an empty string is always allowed, but a non-empty value
  // must contain a realistic amount of actual digits — a PhoneField can
  // otherwise produce e.g. "+54" (country code, zero real digits), which is
  // truthy but not a usable WhatsApp number.
  whatsappNumber: z
    .string()
    .refine(
      (value) => value === "" || value.replace(/\D/g, "").length >= 8,
      "Enter a valid WhatsApp number",
    ),
  // Form-only field, not persisted server-side — see ClubSettingsFormValues.
  whatsappCountry: z.string(),
  address: z.string(),
  country: z.string(),
  province: z.string(),
  city: z.string(),
  zipCode: z.string(),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required"),
});

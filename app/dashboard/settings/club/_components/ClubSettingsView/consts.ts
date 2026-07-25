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
  logoUrl: z.string(),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required"),
});

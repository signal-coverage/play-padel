import { z } from "zod";

// Every user-facing validation message lives in the messages/*.json
// "ClubSettingsValidation" namespace, not as a literal here — this schema is
// built once per render, so it can't call useTranslations() itself.
// ClubSettingsView.tsx builds it via buildClubSettingsFormSchema(t), passing
// its own useTranslations('ClubSettingsValidation') result — same factory
// pattern as app/onboarding/types.ts's buildOnboardingFormSchema.
export type ClubSettingsValidationT = (key: string) => string;

// Mirrors core/clubs/schemas/club.schema.ts's updateClubSchema for the fields
// this form edits. The server-side schema remains the source of truth — this
// only drives inline field validation on the client.
export function buildClubSettingsFormSchema(t: ClubSettingsValidationT) {
  return z.object({
    name: z.string().min(1, t("nameRequired")),
    legalName: z.string(),
    taxId: z.string(),
    email: z.string().min(1, t("emailRequired")).email(t("emailInvalid")),
    phone: z.string(),
    // Optional field: an empty string is always allowed, but a non-empty
    // value must contain a realistic amount of actual digits — a PhoneField
    // can otherwise produce e.g. "+54" (country code, zero real digits),
    // which is truthy but not a usable WhatsApp number.
    whatsappNumber: z
      .string()
      .refine(
        (value) => value === "" || value.replace(/\D/g, "").length >= 8,
        t("whatsappInvalid"),
      ),
    // Form-only field, not persisted server-side — see ClubSettingsFormValues.
    whatsappCountry: z.string(),
    address: z.string(),
    country: z.string(),
    province: z.string(),
    city: z.string(),
    zipCode: z.string(),
    timezone: z.string().min(1, t("timezoneRequired")),
    currency: z.string().min(1, t("currencyRequired")),
  });
}

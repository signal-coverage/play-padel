import { z } from "zod";

export const ONBOARDING_USER_TYPES = ["player", "owner"] as const;
export type OnboardingUserType = (typeof ONBOARDING_USER_TYPES)[number];

// Matches prisma/schema.prisma's Gender enum. Defined as a plain literal
// union here rather than importing the generated Prisma enum, following the
// existing core/users/types convention (SystemRole, UserStatus).
export const GENDER_VALUES = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] as const;
export type Gender = (typeof GENDER_VALUES)[number];
export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

// Argentine padel skill-level convention: Category 1 is the highest level,
// Category 8 is a beginner. "unknown" submits as a null padelCategory.
// Defined in core/users/consts (core/ owns domain vocabulary; app/ only
// re-exports it here so existing imports from this module keep working).
export { PADEL_CATEGORY_OPTIONS } from "@/core/users/consts";

// Every user-facing validation message lives in the messages/*.json
// "OnboardingValidation" namespace, not as a literal here — this schema is a
// module-level object built once, so it can't call useTranslations() itself.
// Callers build it via buildOnboardingFormSchema(t), passing whatever `t`
// their environment already has: OnboardingWizard.tsx uses next-intl's
// useTranslations('OnboardingValidation') client-side, and
// app/api/onboarding/route.ts uses next-intl/server's getTranslations()
// server-side — both resolve to the same request's locale either way.
export type OnboardingValidationT = (key: string) => string;

// Owner-only fields are optional at the schema level and enforced via
// superRefine, since players skip them entirely (see docs/reservation-flow.md
// — a Club only exists for owners; UserProfile.clubId is optional). The same
// pattern is used for player-only fields, which owners skip.
export function buildOnboardingFormSchema(t: OnboardingValidationT) {
  return z
    .object({
      // Step 1 — who's onboarding
      userType: z.enum(ONBOARDING_USER_TYPES, {
        message: t("userTypeRequired"),
      }),
      // Step 2 (owner only) — club basics
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      // Owner-only: WhatsApp number payment receipts get sent to. Kept as
      // its own compound phone/country pair (like phone/country above)
      // rather than reusing "phone" — an owner's business WhatsApp is often
      // a different number than their general contact phone.
      whatsappNumber: z.string().optional(),
      whatsappCountry: z.string().optional(),
      // Step 3 (owner only) — legal & billing
      legalName: z.string().optional(),
      taxId: z.string().optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
      // Profile — owner: just a display name.
      displayName: z.string().optional(),
      // Profile — player only
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      address: z.string().optional(),
      country: z.string().optional(),
      province: z.string().optional(),
      city: z.string().optional(),
      zipCode: z.string().optional(),
      gender: z.enum(GENDER_VALUES).optional(),
      padelCategory: z.string().optional(),
      preferredSide: z.enum(["forehand", "backhand"]).optional(),
      dominantHand: z.enum(["right", "left"]).optional(),
      // Terms (both) — two separate checkboxes: an 18+ self-certification
      // (product decision is self-certification only, no DOB field, see
      // docs/COMPLIANCE.md) and terms acceptance. Both gate the same submit
      // moment, so they're still recorded under a single `acceptedTermsAt`
      // timestamp server-side — no need for two DB columns for one instant.
      confirmedAge: z
        .boolean()
        .refine((v) => v === true, t("confirmedAgeRequired")),
      acceptedTerms: z
        .boolean()
        .refine((v) => v === true, t("acceptedTermsRequired")),
    })
    .superRefine((data, ctx) => {
      if (data.userType === "owner") {
        const requiredTextFields: [
          (
            | "name"
            | "phone"
            | "whatsappNumber"
            | "address"
            | "legalName"
            | "taxId"
            | "displayName"
          ),
          string,
        ][] = [
          ["name", t("clubNameRequired")],
          ["phone", t("phoneRequired")],
          ["whatsappNumber", t("whatsappNumberRequired")],
          ["address", t("addressRequired")],
          ["legalName", t("legalNameRequired")],
          ["taxId", t("taxIdRequired")],
          ["displayName", t("displayNameRequired")],
        ];

        for (const [field, message] of requiredTextFields) {
          if (!data[field]) {
            ctx.addIssue({ code: "custom", message, path: [field] });
          }
        }

        // A PhoneField can produce e.g. "+54" (country code, zero real
        // digits) which is truthy and would otherwise pass the
        // required-field check above — require a realistic amount of
        // actual digits too.
        if (
          data.whatsappNumber &&
          data.whatsappNumber.replace(/\D/g, "").length < 8
        ) {
          ctx.addIssue({
            code: "custom",
            message: t("invalidWhatsappNumber"),
            path: ["whatsappNumber"],
          });
        }

        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          ctx.addIssue({
            code: "custom",
            message: t("invalidEmail"),
            path: ["email"],
          });
        }
      }

      if (data.userType === "player") {
        const requiredPlayerFields: [
          "firstName" | "lastName" | "phone" | "gender",
          string,
        ][] = [
          ["firstName", t("firstNameRequired")],
          ["lastName", t("lastNameRequired")],
          ["phone", t("phoneRequired")],
          ["gender", t("genderRequired")],
        ];

        for (const [field, message] of requiredPlayerFields) {
          if (!data[field]) {
            ctx.addIssue({ code: "custom", message, path: [field] });
          }
        }

        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          ctx.addIssue({
            code: "custom",
            message: t("invalidEmail"),
            path: ["email"],
          });
        }
      }
    });
}

export type OnboardingFormValues = z.infer<
  ReturnType<typeof buildOnboardingFormSchema>
>;

// The wizard is two different flows sharing a first ("who are you") step.
export const PLAYER_FLOW = [
  "userType",
  "playerProfile",
  "padelProfile",
  "terms",
] as const;
export const OWNER_FLOW = [
  "userType",
  "clubBasics",
  "legalBilling",
  "profile",
  "terms",
] as const;

export type OnboardingStepKey =
  (typeof PLAYER_FLOW)[number] | (typeof OWNER_FLOW)[number];

export const STEP_FIELDS: Record<
  OnboardingStepKey,
  (keyof OnboardingFormValues)[]
> = {
  userType: ["userType"],
  clubBasics: [
    "name",
    "email",
    "phone",
    "whatsappNumber",
    "address",
    "country",
    "province",
    "city",
    "zipCode",
  ],
  legalBilling: ["legalName", "taxId"],
  profile: ["displayName"],
  playerProfile: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "gender",
    "address",
    "country",
    "province",
    "city",
    "zipCode",
  ],
  padelProfile: ["padelCategory", "preferredSide", "dominantHand"],
  terms: ["confirmedAge", "acceptedTerms"],
};

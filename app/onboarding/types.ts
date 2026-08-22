import { z } from "zod";
import type { Plan } from "@/core/clubs/types";

export const ONBOARDING_USER_TYPES = ["player", "owner"] as const;
export type OnboardingUserType = (typeof ONBOARDING_USER_TYPES)[number];

// Owner picks a court-count range instead of typing a raw number; the range
// is purely a plan-tier signal (no Court rows are created here — see
// /dashboard/courts for actual court creation). Shared between the UI (step
// options) and the API route (deriving the Plan for createClub) so the
// value->plan mapping only lives in one place.
export const COURT_RANGE_OPTIONS: {
  value: string;
  label: string;
  plan: Plan;
  note?: string;
}[] = [
  { value: "1-2", label: "1–2 courts", plan: "BASIC" },
  { value: "3-4", label: "3–4 courts", plan: "PRO" },
  { value: "5-7", label: "5–7 courts", plan: "PLUS" },
  {
    value: "8+",
    label: "8+ courts",
    plan: "MAX",
    note: "Custom pricing — our team will reach out to configure enterprise pricing.",
  },
];
export type CourtRangeValue = (typeof COURT_RANGE_OPTIONS)[number]["value"];

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

// Owner-only fields are optional at the schema level and enforced via
// superRefine, since players skip them entirely (see docs/reservation-flow.md
// — a Club only exists for owners; UserProfile.clubId is optional). The same
// pattern is used for player-only fields, which owners skip.
export const onboardingFormSchema = z
  .object({
    // Step 1 — who's onboarding
    userType: z.enum(ONBOARDING_USER_TYPES, {
      message: "Please choose an option to continue",
    }),
    // Step 2 (owner only) — club basics
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    // Step 3 (owner only) — legal & billing
    legalName: z.string().optional(),
    taxId: z.string().optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    // Step 4 (owner only) — plan / court count
    courtRange: z.string().optional(),
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
      .refine((v) => v === true, "You must confirm you are 18 or older"),
    acceptedTerms: z
      .boolean()
      .refine((v) => v === true, "You must agree to the Terms and Conditions"),
  })
  .superRefine((data, ctx) => {
    if (data.userType === "owner") {
      const requiredTextFields: [
        (
          | "name"
          | "phone"
          | "address"
          | "legalName"
          | "taxId"
          | "courtRange"
          | "displayName"
        ),
        string,
      ][] = [
        ["name", "Club name is required"],
        ["phone", "Phone is required"],
        ["address", "Address is required"],
        ["legalName", "Legal name is required"],
        ["taxId", "Tax ID is required"],
        ["courtRange", "Please select a court range"],
        ["displayName", "Display name is required"],
      ];

      for (const [field, message] of requiredTextFields) {
        if (!data[field]) {
          ctx.addIssue({ code: "custom", message, path: [field] });
        }
      }

      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid email address",
          path: ["email"],
        });
      }
    }

    if (data.userType === "player") {
      const requiredPlayerFields: [
        "firstName" | "lastName" | "phone" | "gender",
        string,
      ][] = [
        ["firstName", "First name is required"],
        ["lastName", "Last name is required"],
        ["phone", "Phone is required"],
        ["gender", "Please select an option"],
      ];

      for (const [field, message] of requiredPlayerFields) {
        if (!data[field]) {
          ctx.addIssue({ code: "custom", message, path: [field] });
        }
      }

      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid email address",
          path: ["email"],
        });
      }
    }
  });

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

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
  "plan",
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
    "address",
    "country",
    "province",
    "city",
    "zipCode",
  ],
  legalBilling: ["legalName", "taxId"],
  plan: ["courtRange"],
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

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
  { value: "1-2", label: "1–2 courts", plan: "FREE" },
  { value: "3-5", label: "3–5 courts", plan: "BASIC" },
  { value: "6-10", label: "6–10 courts", plan: "PRO" },
  {
    value: "11+",
    label: "11+ courts",
    plan: "CUSTOM",
    note: "Our team will reach out to configure enterprise pricing.",
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
export const PADEL_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "Category 1 — highest level" },
  { value: "2", label: "Category 2" },
  { value: "3", label: "Category 3" },
  { value: "4", label: "Category 4" },
  { value: "5", label: "Category 5" },
  { value: "6", label: "Category 6" },
  { value: "7", label: "Category 7" },
  { value: "8", label: "Category 8 — beginner" },
  { value: "unknown", label: "Not sure yet" },
];

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
    gender: z.enum(GENDER_VALUES).optional(),
    padelCategory: z.string().optional(),
    // Terms (both)
    acceptedTerms: z
      .boolean()
      .refine((v) => v === true, "You must accept the Terms and Conditions"),
  })
  .superRefine((data, ctx) => {
    if (data.userType === "owner") {
      const requiredTextFields: [
        (
          | "name"
          | "phone"
          | "legalName"
          | "taxId"
          | "timezone"
          | "currency"
          | "courtRange"
          | "displayName"
        ),
        string,
      ][] = [
        ["name", "Club name is required"],
        ["phone", "Phone is required"],
        ["legalName", "Legal name is required"],
        ["taxId", "Tax ID is required"],
        ["timezone", "Timezone is required"],
        ["currency", "Currency is required"],
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
export const PLAYER_FLOW = ["userType", "playerProfile", "terms"] as const;
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
  clubBasics: ["name", "email", "phone"],
  legalBilling: ["legalName", "taxId", "timezone", "currency"],
  plan: ["courtRange"],
  profile: ["displayName"],
  playerProfile: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "gender",
    "padelCategory",
  ],
  terms: ["acceptedTerms"],
};

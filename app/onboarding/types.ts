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
    // Step 4 (owner only) — weekly operating hours: club-level "normally
    // open" days/hours, distinct from per-court CourtAvailability. Always
    // exactly 7 entries in practice (one per day of week, active: false for
    // closed days) — enforced by the superRefine branch below, not the shape
    // itself, since players never populate this field at all.
    operatingHours: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          active: z.boolean(),
          startTime: z.string(),
          endTime: z.string(),
        }),
      )
      .optional(),
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
        "name" | "phone" | "address" | "legalName" | "taxId" | "displayName",
        string,
      ][] = [
        ["name", "Club name is required"],
        ["phone", "Phone is required"],
        ["address", "Address is required"],
        ["legalName", "Legal name is required"],
        ["taxId", "Tax ID is required"],
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

      const operatingHours = data.operatingHours ?? [];
      const hasActiveDay = operatingHours.some((entry) => entry.active);
      if (!hasActiveDay) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one day your club is open",
          path: ["operatingHours"],
        });
      } else {
        operatingHours.forEach((entry, index) => {
          if (entry.active && entry.startTime === entry.endTime) {
            ctx.addIssue({
              code: "custom",
              message: "Start and end time cannot be the same",
              path: ["operatingHours", index, "endTime"],
            });
          }
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
  "operatingHours",
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
  operatingHours: ["operatingHours"],
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

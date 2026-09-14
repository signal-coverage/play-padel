import { z } from "zod";
import type { NewClubClosureFormValues } from "./types";

export const DEFAULT_VALUES: NewClubClosureFormValues = {
  startsAt: "",
  endsAt: "",
  reason: "",
};

// Every user-facing validation message lives in the messages/*.json
// "NewClubClosureFormValidation" namespace, not as a literal here — this
// schema is built once per render, so it can't call useTranslations() itself.
// NewClubClosureForm.tsx builds it via buildNewClubClosureFormSchema(t),
// passing its own useTranslations('NewClubClosureFormValidation') result —
// same factory pattern as app/onboarding/types.ts's
// buildOnboardingFormSchema.
export type NewClubClosureValidationT = (key: string) => string;

// Mirrors ../../../../../courts/_components/CourtsView/components/ClosuresSheet/components/NewClosureForm/consts.ts's
// buildNewClosureFormSchema, minus the per-court-only applyToAllCourts field
// — this form always applies to every active court.
export function buildNewClubClosureFormSchema(t: NewClubClosureValidationT) {
  return z
    .object({
      startsAt: z.string().min(1, t("startRequired")),
      endsAt: z.string().min(1, t("endRequired")),
      reason: z.string().min(1, t("reasonRequired")),
    })
    .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
      message: t("endMustBeAfterStart"),
      path: ["endsAt"],
    })
    .refine((data) => new Date(data.endsAt) > new Date(), {
      message: t("closureNotInPast"),
      path: ["endsAt"],
    });
}

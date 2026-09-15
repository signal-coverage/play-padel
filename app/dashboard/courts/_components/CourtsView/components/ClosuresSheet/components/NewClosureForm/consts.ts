import { z } from "zod";
import type { NewClosureFormValues } from "./types";

export const DEFAULT_VALUES: NewClosureFormValues = {
  startsAt: "",
  endsAt: "",
  reason: "",
  applyToAllCourts: false,
};

// Every user-facing validation message lives in the messages/*.json
// "NewClosureFormValidation" namespace, not as a literal here — this schema
// is built once per render, so it can't call useTranslations() itself.
// NewClosureForm.tsx builds it via buildNewClosureFormSchema(t), passing its
// own useTranslations('NewClosureFormValidation') result — same factory
// pattern as app/onboarding/types.ts's buildOnboardingFormSchema.
export type NewClosureValidationT = (key: string) => string;

export function buildNewClosureFormSchema(t: NewClosureValidationT) {
  return z
    .object({
      startsAt: z.string().min(1, t("startRequired")),
      endsAt: z.string().min(1, t("endRequired")),
      reason: z.string().min(1, t("reasonRequired")),
      applyToAllCourts: z.boolean(),
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

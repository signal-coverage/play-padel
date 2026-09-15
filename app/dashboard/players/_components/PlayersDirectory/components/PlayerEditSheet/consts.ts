import { z } from "zod";
import {
  buildDominantHandOptions,
  buildPreferredSideOptions,
} from "@/core/users/consts";
import type { UserOptionLabelsT } from "@/core/users/consts";

// "notSetYet" mirrors getPreferredSideLabel/getDominantHandLabel's own label
// for a null value (see core/users/consts.ts) — this sentinel is what
// ./utils.ts's formValuesToPatchInput converts back to null on submit.
// Callers pass their own next-intl `t` (PlayerEditSheet.tsx's
// useTranslations('PlayerEditSheet')) since this is a plain data module and
// can't call useTranslations() itself — same factory pattern as
// buildCategoryFilterOptions in ../../consts.tsx. `tOptions` is a second,
// separate useTranslations('UserOptionLabels') result — the base
// forehand/backhand/right/left labels live in that shared namespace (see
// core/users/consts.ts), not under "PlayerEditSheet".
export function buildPreferredSideSelectOptions(
  t: (key: string) => string,
  tOptions: UserOptionLabelsT,
) {
  return [
    { value: "unset", label: t("notSetYet") },
    ...buildPreferredSideOptions(tOptions),
  ];
}

export function buildDominantHandSelectOptions(
  t: (key: string) => string,
  tOptions: UserOptionLabelsT,
) {
  return [
    { value: "unset", label: t("notSetYet") },
    ...buildDominantHandOptions(tOptions),
  ];
}

// Every user-facing validation message lives in the messages/*.json
// "PlayerEditValidation" namespace, not as a literal here — this schema is a
// module-level object built once, so it can't call useTranslations() itself.
// PlayerEditSheet.tsx builds it via buildPlayerEditFormSchema(t), passing its
// own useTranslations('PlayerEditValidation') result — same factory pattern
// as buildOnboardingFormSchema in app/onboarding/types.ts.
export type PlayerEditValidationT = (key: string) => string;

// Mirrors PlayerEditFormValues's shape (see ./types.ts) — drives inline
// field validation only. The real PATCH payload conversion (string enums ->
// real typed values) happens in ./utils.ts's formValuesToPatchInput.
export function buildPlayerEditFormSchema(t: PlayerEditValidationT) {
  return z.object({
    displayName: z.string().min(1, t("nameRequired")),
    email: z.string().email(t("invalidEmail")),
    phone: z.string(),
    padelCategory: z.string(),
    preferredSide: z.string(),
    dominantHand: z.string(),
  });
}

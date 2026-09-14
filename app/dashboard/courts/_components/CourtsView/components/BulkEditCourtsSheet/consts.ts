import { z } from "zod";
import { DEFAULT_SLOT_DURATION_MINUTES } from "@/core/courts/consts";
import { DEFAULT_COURT_COLOR } from "../../utils";
import type { BulkEditFormValues } from "./types";

// Every user-facing validation message lives in the messages/*.json
// "BulkEditCourtsValidation" namespace, not as a literal here — this schema
// is built once per render, so it can't call useTranslations() itself.
// BulkEditCourtsSheet.tsx builds it via buildBulkEditFormSchema(t), passing
// its own useTranslations('BulkEditCourtsValidation') result — same factory
// pattern as app/onboarding/types.ts's buildOnboardingFormSchema.
export type BulkEditValidationT = (key: string) => string;

// Every field's `value` reuses the same defaults CourtFormSheet's own
// create-mode form seeds with (see ../../utils.ts's courtToFormValues) so an
// unedited, disabled row's placeholder value is always a valid one and never
// blocks submission — only enabled fields are ever sent to the server.
export const DEFAULT_VALUES: BulkEditFormValues = {
  surface: { enabled: false, value: "concrete" },
  indoor: { enabled: false, value: false },
  color: { enabled: false, value: DEFAULT_COURT_COLOR },
  slotDurationMinutes: {
    enabled: false,
    value: DEFAULT_SLOT_DURATION_MINUTES,
  },
  reservationFee: { enabled: false, value: 0 },
  courtPrice: { enabled: false, value: 0 },
  active: { enabled: false, value: true },
};

// Each field's `value` sub-schema mirrors courtFormSchema's own validation
// rules (see ../CourtFormSheet/consts.ts) for that same field. `enabled` has
// no validation of its own — it's a plain toggle.
export function buildBulkEditFormSchema(t: BulkEditValidationT) {
  return z.object({
    surface: z.object({
      enabled: z.boolean(),
      value: z.string().min(1, t("surfaceRequired")),
    }),
    indoor: z.object({
      enabled: z.boolean(),
      value: z.boolean(),
    }),
    color: z.object({
      enabled: z.boolean(),
      value: z.string().min(1, t("colorRequired")),
    }),
    slotDurationMinutes: z.object({
      enabled: z.boolean(),
      value: z
        .number({ message: t("slotDurationMustBeNumber") })
        .int()
        .positive(t("slotDurationMustBePositive")),
    }),
    reservationFee: z.object({
      enabled: z.boolean(),
      value: z
        .number({ message: t("reservationFeeMustBeNumber") })
        .nonnegative(t("reservationFeeCannotBeNegative")),
    }),
    courtPrice: z.object({
      enabled: z.boolean(),
      value: z.number().nonnegative(t("courtPriceCannotBeNegative")),
    }),
    active: z.object({
      enabled: z.boolean(),
      value: z.boolean(),
    }),
  });
}

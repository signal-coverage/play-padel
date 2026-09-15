import { z } from "zod";

// Every user-facing validation message lives in the messages/*.json
// "CourtFormValidation" namespace, not as a literal here — this schema is
// built once per render, so it can't call useTranslations() itself.
// CourtFormSheet.tsx builds it via buildCourtFormSchema(t), passing its own
// useTranslations('CourtFormValidation') result — same factory pattern as
// app/onboarding/types.ts's buildOnboardingFormSchema.
export type CourtFormValidationT = (key: string) => string;

// Mirrors core/courts/schemas/court.schema.ts's shape for the fields this
// form edits, plus the client-only "active" toggle (only shown in edit
// mode). Server-side createCourtSchema/updateCourtSchema remain the source
// of truth — this only drives inline field validation in the Sheet.
export function buildCourtFormSchema(t: CourtFormValidationT) {
  return z.object({
    name: z.string().min(1, t("nameRequired")),
    // See CourtFormSheet.tsx's registration of this field (setValueAs, not
    // valueAsNumber) — an empty optional number input must resolve to
    // `undefined` here, never NaN, or Create/Save would stay permanently
    // disabled until the owner typed something into a field that's optional.
    courtNumber: z.number().int().positive().optional(),
    surface: z.string().min(1, t("surfaceRequired")),
    indoor: z.boolean(),
    color: z.string().min(1, t("colorRequired")),
    // Genuinely optional physical characteristics — a court without a chosen
    // wall/net type is still valid, unlike surface/color above.
    wallType: z.string().optional(),
    lighting: z.boolean(),
    netType: z.string().optional(),
    // Optional, unlike name/surface/color: a court without a photo is valid.
    photoUrl: z.string().url().optional(),
    slotDurationMinutes: z
      .number({ message: t("slotDurationMustBeNumber") })
      .int()
      .positive(t("slotDurationMustBePositive")),
    reservationFee: z
      .number({ message: t("reservationFeeRequired") })
      .nonnegative(t("reservationFeeCannotBeNegative")),
    courtPrice: z.number().nonnegative().optional(),
    active: z.boolean(),
  });
}

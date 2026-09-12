import { z } from "zod";

// Mirrors core/courts/schemas/court.schema.ts's shape for the fields this
// form edits, plus the client-only "active" toggle (only shown in edit
// mode). Server-side createCourtSchema/updateCourtSchema remain the source
// of truth — this only drives inline field validation in the Sheet.
export const courtFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // See CourtFormSheet.tsx's registration of this field (setValueAs, not
  // valueAsNumber) — an empty optional number input must resolve to
  // `undefined` here, never NaN, or Create/Save would stay permanently
  // disabled until the owner typed something into a field that's optional.
  courtNumber: z.number().int().positive().optional(),
  surface: z.string().min(1, "Surface is required"),
  indoor: z.boolean(),
  color: z.string().min(1, "Color is required"),
  // Genuinely optional physical characteristics — a court without a chosen
  // wall/net type is still valid, unlike surface/color above.
  wallType: z.string().optional(),
  lighting: z.boolean(),
  netType: z.string().optional(),
  // Optional, unlike name/surface/color: a court without a photo is valid.
  photoUrl: z.string().url().optional(),
  slotDurationMinutes: z
    .number({ message: "Slot duration must be a number" })
    .int()
    .positive("Slot duration must be greater than 0"),
  reservationFee: z
    .number({ message: "Reservation fee is required" })
    .nonnegative("Reservation fee cannot be negative"),
  courtPrice: z.number().nonnegative().optional(),
  active: z.boolean(),
});

import { z } from "zod";

// Mirrors core/courts/schemas/court.schema.ts's shape for the fields this
// form edits, plus the client-only "active" toggle (only shown in edit
// mode). Server-side createCourtSchema/updateCourtSchema remain the source
// of truth — this only drives inline field validation in the Sheet.
export const courtFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surface: z.string(),
  indoor: z.boolean(),
  color: z.string(),
  slotDurationMinutes: z
    .number({ message: "Slot duration must be a number" })
    .int()
    .positive("Slot duration must be greater than 0"),
  active: z.boolean(),
});

import { z } from "zod";
import { DEFAULT_SLOT_DURATION_MINUTES } from "@/core/courts/consts";
import { DEFAULT_COURT_COLOR } from "../../utils";
import type { BulkEditFormValues } from "./types";

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
export const bulkEditFormSchema = z.object({
  surface: z.object({
    enabled: z.boolean(),
    value: z.string().min(1, "Surface is required"),
  }),
  indoor: z.object({
    enabled: z.boolean(),
    value: z.boolean(),
  }),
  color: z.object({
    enabled: z.boolean(),
    value: z.string().min(1, "Color is required"),
  }),
  slotDurationMinutes: z.object({
    enabled: z.boolean(),
    value: z
      .number({ message: "Slot duration must be a number" })
      .int()
      .positive("Slot duration must be greater than 0"),
  }),
  reservationFee: z.object({
    enabled: z.boolean(),
    value: z
      .number({ message: "Reservation fee must be a number" })
      .nonnegative("Reservation fee cannot be negative"),
  }),
  courtPrice: z.object({
    enabled: z.boolean(),
    value: z.number().nonnegative("Court price cannot be negative"),
  }),
  active: z.object({
    enabled: z.boolean(),
    value: z.boolean(),
  }),
});

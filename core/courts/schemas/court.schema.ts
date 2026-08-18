import { z } from "zod";

export const createCourtSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surface: z.string().optional(),
  indoor: z.boolean().optional(),
  color: z.string().optional(),
  photoUrl: z.string().url().optional(),
  slotDurationMinutes: z.number().int().positive().optional(),
  reservationFee: z.number().nonnegative().optional(),
  courtPrice: z.number().nonnegative().optional(),
});

export const updateCourtSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  surface: z.string().optional(),
  indoor: z.boolean().optional(),
  color: z.string().optional(),
  photoUrl: z.string().url().optional(),
  slotDurationMinutes: z.number().int().positive().optional(),
  reservationFee: z.number().nonnegative().optional(),
  courtPrice: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
});

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const availabilityEntrySchema = z
  .object({
    dayOfWeek: z
      .number()
      .int()
      .min(0, "Day of week must be 0-6")
      .max(6, "Day of week must be 0-6"),
    startTime: z
      .string()
      .regex(timeRegex, "Start time must be in HH:mm format"),
    endTime: z.string().regex(timeRegex, "End time must be in HH:mm format"),
  })
  .refine((entry) => entry.endTime > entry.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const weeklyAvailabilityTemplateSchema = z.array(
  availabilityEntrySchema,
);

export const createClosureSchema = z
  .object({
    startsAt: z.string().min(1, "Start is required"),
    endsAt: z.string().min(1, "End is required"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  })
  .refine((data) => new Date(data.endsAt) > new Date(), {
    message: "Closure must not be entirely in the past",
    path: ["endsAt"],
  });

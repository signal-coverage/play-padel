import { z } from "zod";

export const createReservationSchema = z
  .object({
    userId: z.string().min(1, "User is required"),
    courtId: z.string().min(1, "Court is required"),
    scheduledStart: z.string().min(1, "Start date/time is required"),
    scheduledEnd: z.string().min(1, "End date/time is required"),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.scheduledStart || !data.scheduledEnd) return true;
      return new Date(data.scheduledEnd) > new Date(data.scheduledStart);
    },
    {
      message: "End date/time must be after start date/time",
      path: ["scheduledEnd"],
    },
  );

export const updateReservationSchema = z.object({
  userId: z.string().optional(),
  courtId: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

import { z } from "zod";

export const createAppointmentSchema = z
  .object({
    patientId: z.string().min(1, "Patient is required"),
    scheduledStart: z.string().min(1, "Start date/time is required"),
    scheduledEnd: z.string().min(1, "End date/time is required"),
    professionalId: z.string().optional(),
    reason: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
    pluginId: z.string().optional(),
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

export const updateAppointmentSchema = z.object({
  patientId: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  professionalId: z.string().optional(),
  reason: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  pluginId: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

import { z } from "zod";

export const createProfessionalSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  specialties: z.array(z.string()).optional().default([]),
  license: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  calendarColor: z.string().optional(),
  userId: z.string().optional(),
});

export const updateProfessionalSchema = createProfessionalSchema.partial();

export const createWorkingHoursSchema = z
  .object({
    dayOfWeek: z
      .number()
      .int()
      .min(0, "Day of week must be 0-6")
      .max(6, "Day of week must be 0-6"),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format"),
    active: z.boolean().optional().default(true),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;
export type CreateWorkingHoursInput = z.infer<typeof createWorkingHoursSchema>;

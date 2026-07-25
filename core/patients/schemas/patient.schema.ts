import { z } from "zod";

export const createPatientSchema = z.object({
  documentType: z.enum(["DNI", "PASSPORT", "CUIL", "OTHER"]),
  documentNumber: z.string().min(1, "Document number is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  birthDate: z
    .string()
    .min(1, "Birth date is required")
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date")
    .refine(
      (date) => new Date(date) <= new Date(),
      "Birth date cannot be in the future",
    ),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  insurance: z
    .object({
      provider: z.string().optional(),
      policyNumber: z.string().optional(),
      groupNumber: z.string().optional(),
      holderName: z.string().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1),
      relationship: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

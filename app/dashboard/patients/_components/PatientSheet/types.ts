import { z } from "zod";
import type { Patient } from "@/core/patients/types";

export const patientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  documentType: z.enum(["DNI", "PASSPORT", "CUIL", "OTHER"], {
    error: "Document type is required",
  }),
  documentNumber: z.string().min(1, "Document number is required"),
  gender: z
    .enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
    .optional()
    .or(z.literal("")),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.email("Invalid email format").optional().or(z.literal("")),
  notes: z.string().optional(),
  // Emergency contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  // Insurance
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export interface PatientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
  onSuccess: () => void;
}

// Keep legacy alias for utils.ts compatibility during migration
export type FormValues = PatientFormValues;

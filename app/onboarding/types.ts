import { z } from "zod";

export const onboardingFormSchema = z.object({
  // Step 1 — Clinic basics
  name: z.string().min(1, "Organization name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  // Step 2 — Legal & billing
  legalName: z.string().min(1, "Legal name is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  currency: z.string().min(1, "Currency is required"),
  // Step 3 — Profile
  displayName: z.string().min(1, "Display name is required"),
  // Step 4 — Terms
  acceptedTerms: z
    .boolean()
    .refine((v) => v === true, "You must accept the Terms and Conditions"),
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const STEP_FIELDS: Record<number, (keyof OnboardingFormValues)[]> = {
  1: ["name", "email", "phone"],
  2: ["legalName", "taxId", "currency"],
  3: ["displayName"],
  4: ["acceptedTerms"],
};

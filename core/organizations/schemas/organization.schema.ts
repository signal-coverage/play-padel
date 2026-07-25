import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

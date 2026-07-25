import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  unitPrice: z.number().positive("Unit price must be greater than 0"),
  total: z.number(),
});

export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  appointmentId: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  tax: z.number().min(0, "Tax cannot be negative"),
  discount: z.number().min(0, "Discount cannot be negative"),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  items: z.array(invoiceItemSchema).min(1).optional(),
  tax: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  method: z.enum(["CASH", "CARD", "TRANSFER", "DIGITAL"]),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  reference: z.string().optional(),
});

export type CreateInvoiceSchemaInput = z.infer<typeof createInvoiceSchema>;
export type CreateInvoiceSchemaOutput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceSchemaInput = z.infer<typeof updateInvoiceSchema>;
export type RecordPaymentSchemaInput = z.infer<typeof recordPaymentSchema>;

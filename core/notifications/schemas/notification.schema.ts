import { z } from "zod";

export const notificationTypeSchema = z.enum([
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_CANCELLED",
  "INVOICE_PAID",
  "PATIENT_BIRTHDAY",
]);

export const notificationStatusSchema = z.enum(["PENDING", "SENT", "FAILED"]);

export const dispatchParamsSchema = z.object({
  type: notificationTypeSchema,
  organizationId: z.string().min(1),
  recipientId: z.string().min(1),
  recipientEmail: z.string().email().nullable().optional(),
  recipientName: z.string().min(1),
  subject: z.string().min(1),
  html: z.string().min(1),
});

export const listNotificationsFiltersSchema = z.object({
  type: notificationTypeSchema.optional(),
  status: notificationStatusSchema.optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type ListNotificationsFilters = z.infer<
  typeof listNotificationsFiltersSchema
>;

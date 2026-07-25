import type { CreateInvoiceSchemaOutput } from "@/core/billing/schemas/billing.schema";

export const DEFAULT_INVOICE_VALUES: CreateInvoiceSchemaOutput = {
  patientId: "",
  currency: "USD",
  items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
  tax: 0,
  discount: 0,
  notes: "",
};

export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "ARS", label: "ARS" },
  { value: "EUR", label: "EUR" },
];

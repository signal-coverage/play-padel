import type { InvoiceStatus } from "@/core/billing/types";

export const STATUS_FILTER_OPTIONS: {
  value: InvoiceStatus | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ISSUED", label: "Issued" },
  { value: "PAID", label: "Paid" },
  { value: "VOID", label: "Void" },
];

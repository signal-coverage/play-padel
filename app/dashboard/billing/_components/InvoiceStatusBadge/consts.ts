import type { InvoiceStatus } from "@/core/billing/types";

export { INVOICE_STATUS_LABEL } from "@/core/billing/consts";

export const INVOICE_STATUS_CLASS: Record<InvoiceStatus, string> = {
  DRAFT: "",
  ISSUED:
    "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  PAID: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  VOID: "",
};

export const INVOICE_STATUS_VARIANT: Record<
  InvoiceStatus,
  "secondary" | "outline" | "default" | "destructive"
> = {
  DRAFT: "secondary",
  ISSUED: "outline",
  PAID: "default",
  VOID: "destructive",
};

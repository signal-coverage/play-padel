import type { Invoice, InvoiceFilters } from "@/core/billing/types";

export type SheetMode = "create" | "edit" | null;

export interface BillingPageProps {}

export interface BillingPageState {
  invoices: Invoice[];
  loading: boolean;
  filters: InvoiceFilters;
  sheetMode: SheetMode;
  selectedInvoice: Invoice | null;
  paymentTarget: Invoice | null;
  cashDialogOpen: boolean;
}

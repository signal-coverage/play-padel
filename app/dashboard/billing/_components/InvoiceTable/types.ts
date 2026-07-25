import type { Invoice } from "@/core/billing/types";

export interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onEdit: (invoice: Invoice) => void;
  onIssue: (invoice: Invoice) => void;
  onVoid: (invoice: Invoice) => void;
  onPay: (invoice: Invoice) => void;
}

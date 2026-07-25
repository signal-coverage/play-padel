export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "DIGITAL";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference?: string;
  paidAt: Date;
  createdAt: Date;
  createdBy?: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  number: number;
  status: InvoiceStatus;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  issuedAt?: Date;
  paidAt?: Date;
  voidedAt?: Date;
  voidedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  payments: Payment[];
}

export interface CreateInvoiceInput {
  patientId: string;
  appointmentId?: string;
  currency: string;
  items: InvoiceItem[];
  tax?: number;
  discount?: number;
  notes?: string;
}

export interface UpdateInvoiceInput {
  items?: InvoiceItem[];
  tax?: number;
  discount?: number;
  notes?: string;
}

export interface RecordPaymentInput {
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  reference?: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  patientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedInvoices {
  invoices: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DailyCashSummary {
  date: string;
  total: number;
  byMethod: Partial<Record<PaymentMethod, number>>;
}

export type ActionResult<T> =
  { success: true; data: T } | { success: false; error: string };

export interface InvoiceReceiptData {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  issuedAt: Date | null;
  paidAt: Date | null;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  currency: string;
  patientName: string;
  organizationName: string;
  organizationEmail: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  payments: { date: Date; method: string; amount: number }[];
}

import type { Invoice } from "@/core/billing/types";

export interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AppointmentOption {
  id: string;
  scheduledStart: Date;
  reason?: string;
}

export type InvoiceSheetMode = "create" | "edit";

export interface InvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: InvoiceSheetMode;
  invoice?: Invoice;
  onSuccess: () => void;
  initialPatientId?: string;
  initialAppointmentId?: string;
}

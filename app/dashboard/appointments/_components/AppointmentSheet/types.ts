import type { Appointment } from "@/core/appointments/types";

export interface AppointmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment;
  defaultDate?: Date;
  onSuccess: () => void;
}

export interface AppointmentFormValues {
  patientId: string;
  professionalId: string;
  scheduledStart: string;
  durationMinutes: number;
  reason: string;
  location: string;
  notes: string;
}

import type { Appointment } from "@/core/appointments/types";

export interface AppointmentListProps {
  appointments: Appointment[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  onNoShow: (id: string) => void;
  onCreateInvoice?: (appointmentId: string, patientId: string) => void;
  onRowClick?: (appointment: Appointment) => void;
}

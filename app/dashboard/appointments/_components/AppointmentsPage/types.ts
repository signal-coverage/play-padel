import type { Appointment } from "@/core/appointments/types";

export interface AppointmentsPageState {
  selectedDate: Date;
  appointments: Appointment[];
  loading: boolean;
  sheetOpen: boolean;
  editingAppointment: Appointment | undefined;
}

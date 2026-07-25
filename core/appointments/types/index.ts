export type AppointmentStatus =
  "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface Appointment {
  id: string;
  organizationId: string;
  patientId: string;
  patientName: string;
  professionalId?: string;
  professionalName?: string;
  pluginId?: string;
  status: AppointmentStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  reason?: string;
  location?: string;
  notes?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  scheduledStart: string;
  scheduledEnd: string;
  professionalId?: string;
  reason?: string;
  location?: string;
  notes?: string;
  pluginId?: string;
}

export interface UpdateAppointmentInput {
  patientId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  professionalId?: string;
  reason?: string;
  location?: string;
  notes?: string;
  pluginId?: string;
}

export interface AppointmentFilters {
  date?: Date;
  dateFrom?: string; // ISO date string "YYYY-MM-DD"
  dateTo?: string; // ISO date string "YYYY-MM-DD"
  professionalId?: string;
  status?: AppointmentStatus;
  patientId?: string;
}

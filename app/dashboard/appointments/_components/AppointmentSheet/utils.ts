import { format } from "date-fns";
import type { Appointment } from "@/core/appointments/types";
import type { AppointmentFormValues } from "./types";

export function getInitialValues(
  appointment?: Appointment,
  defaultDate?: Date,
): AppointmentFormValues {
  if (appointment) {
    const startMs = new Date(appointment.scheduledStart).getTime();
    const endMs = new Date(appointment.scheduledEnd).getTime();
    const derived = Math.round((endMs - startMs) / 60000);
    return {
      patientId: appointment.patientId,
      professionalId: appointment.professionalId ?? "",
      scheduledStart: new Date(appointment.scheduledStart).toISOString().slice(0, 16),
      durationMinutes: derived > 0 ? derived : 60,
      reason: appointment.reason ?? "",
      location: appointment.location ?? "",
      notes: appointment.notes ?? "",
    };
  }

  const base = defaultDate ?? new Date();
  const dateStr = format(base, "yyyy-MM-dd");
  return {
    patientId: "",
    professionalId: "",
    scheduledStart: `${dateStr}T09:00`,
    durationMinutes: 60,
    reason: "",
    location: "",
    notes: "",
  };
}

export function isPastDateTime(isoString: string): boolean {
  if (!isoString) return false;
  return new Date(isoString) < new Date();
}

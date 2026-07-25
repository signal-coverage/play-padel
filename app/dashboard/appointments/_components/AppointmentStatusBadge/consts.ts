import type { AppointmentStatus } from "@/core/appointments/types";

export const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "",
  },
  COMPLETED: {
    label: "Completed",
    className: "",
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
};

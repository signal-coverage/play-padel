import type { ReservationStatus } from "@/core/reservations/types";

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

// MVP rule: a user may self-cancel up to this many hours before
// scheduledStart. Inside the window, cancellation must go through the club
// owner (phone/in-person) — see docs/reservation-flow.md.
export const SELF_CANCEL_CUTOFF_HOURS = 2;

import type { ReservationStatus } from "@/core/reservations/types";

// Single source of truth for "does this status still block a slot / count as
// an active reservation" — shared by reservations.service.ts and
// courts.service.ts (previously two independently-maintained copies).
export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
];

// How long an unpaid SCHEDULED (pending-payment) reservation holds its slot
// before it's treated as lapsed. See docs: Payments spec, "Slot-hold-with-expiry".
export const PAYMENT_HOLD_MINUTES = 15;

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

// Single source of truth for reservation-status badge colors, shared by the
// player ("my-reservations") and owner ("reservations") screens so a given
// status always renders the same color regardless of who is viewing it.
export const STATUS_BADGE_VARIANT: Record<
  ReservationStatus,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  SCHEDULED: "secondary",
  CONFIRMED: "success",
  CANCELLED: "outline",
  COMPLETED: "secondary",
  NO_SHOW: "destructive",
};

// MVP rule: a user may self-cancel up to this many hours before
// scheduledStart. Inside the window, cancellation must go through the club
// owner (phone/in-person) — see docs/reservation-flow.md.
export const SELF_CANCEL_CUTOFF_HOURS = 2;

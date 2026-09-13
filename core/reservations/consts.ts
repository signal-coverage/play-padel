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

// Actor stamp for a Mercado Pago hold that lapsed unpaid and was lazily
// transitioned to CANCELLED by reservations.service.ts (rather than by a real
// user action) — mirrors confirmReservationPayment's own
// "system:mercadopago-webhook" convention. Used both by the lazy-expiry path
// (triggered from any read: My Reservations, the owner's reservation list/
// detail, the SSE stream) and by the once-daily mercadopago-hold-sweep cron's
// backstop cleanup for a hold nobody ever read again.
export const MP_HOLD_EXPIRY_ACTOR = "system:mp-hold-expiry";

// How long an unpaid SCHEDULED bank-transfer reservation holds its slot
// before it's treated as lapsed — longer than PAYMENT_HOLD_MINUTES because
// confirming a transfer requires a human (the club owner) to notice a
// WhatsApp message and manually check their bank account, unlike Mercado
// Pago's instant webhook confirmation. See docs: bank-transfer-payment-
// method design, "Hold window".
export const BANK_TRANSFER_HOLD_MINUTES = 60;

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

// A reservation's booker may tag at most this many other registered players
// as co-players (see prisma/schema.prisma's ReservationPartner). Enforced
// both client-side (defense in depth) and server-side (the real guard, in
// reservationPartners.service.ts's validatePartnerIds).
export const MAX_RESERVATION_PARTNERS = 3;

// Which statuses count toward "times played together" / "Latest Partner"
// (see reservationPartners.service.ts). Deliberately narrower than
// ACTIVE_RESERVATION_STATUSES above (SCHEDULED, CONFIRMED): a SCHEDULED
// reservation is only a pending-payment hold that can still lapse, so it
// isn't a real "played together" yet; NO_SHOW means the booking existed but
// nobody actually played. CONFIRMED (the MVP's real booked/paid state) and
// COMPLETED both count as a real, played reservation.
export const PARTNER_ELIGIBLE_RESERVATION_STATUSES: readonly ReservationStatus[] =
  ["CONFIRMED", "COMPLETED"];

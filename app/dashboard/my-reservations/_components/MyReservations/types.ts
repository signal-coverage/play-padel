import type { Reservation } from "@/core/reservations/types";

// Same shape core/reservations returns, plus server-computed flags added by
// GET /api/player/reservations: canSelfCancel (docs/reservation-flow.md's
// 2-hour self-cancel cutoff, via core's canSelfCancel()) and hasReceipt
// (whether this reservation has an invoice with a COMPLETED payment — only
// then is there anything to show a "Download receipt" action for).
export type PlayerReservation = Reservation & {
  canSelfCancel: boolean;
  hasReceipt: boolean;
};

export type RawPlayerReservation = Omit<
  PlayerReservation,
  "scheduledStart" | "scheduledEnd" | "cancelledAt" | "createdAt" | "updatedAt"
> & {
  scheduledStart: string;
  scheduledEnd: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CancelTarget = {
  id: string;
  courtName: string;
  scheduledStart: Date;
};

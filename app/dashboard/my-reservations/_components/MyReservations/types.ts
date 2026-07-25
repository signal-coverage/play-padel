import type { Reservation } from "@/core/reservations/types";

// Same shape core/reservations returns, plus the server-computed
// canSelfCancel flag added by GET /api/player/reservations (see
// docs/reservation-flow.md's 2-hour self-cancel cutoff — computed once on
// the server via core's canSelfCancel(), not reimplemented here).
export type PlayerReservation = Reservation & { canSelfCancel: boolean };

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

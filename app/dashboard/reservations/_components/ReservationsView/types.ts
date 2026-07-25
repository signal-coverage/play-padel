import type { ReservationStatus } from "@/core/reservations/types";

export type CourtSummary = {
  id: string;
  name: string;
};

export type ReservationRecord = {
  id: string;
  courtId: string;
  courtName: string;
  userName: string;
  status: ReservationStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
};

export type ReservationActionKind = "cancel" | "complete" | "noShow";

export type ReservationActionInput = {
  reservationId: string;
  action: ReservationActionKind;
};

/** Wire-format shapes as they come back from the API routes (Date fields are
 * ISO strings over JSON). */
export type RawSlot = {
  start: string;
  end: string;
  status: "free" | "locked";
  reservationId?: string;
};

export type RawReservation = {
  id: string;
  courtId: string;
  courtName: string;
  userName: string;
  status: ReservationStatus;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string;
};

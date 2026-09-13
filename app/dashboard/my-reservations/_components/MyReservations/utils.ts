import { format } from "date-fns";
import type { PlayerReservation, RawPlayerReservation } from "./types";

export function toPlayerReservation(
  raw: RawPlayerReservation,
): PlayerReservation {
  return {
    ...raw,
    scheduledStart: new Date(raw.scheduledStart),
    scheduledEnd: new Date(raw.scheduledEnd),
    cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt) : undefined,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export function formatReservationDateTime(start: Date, end: Date): string {
  return `${format(start, "EEE, MMM d · h:mmaaa")} – ${format(end, "h:mmaaa")}`;
}

// Drives useMyReservations' refetchInterval (see ./hooks.ts): is there a
// reservation in this list still awaiting a payment outcome the player isn't
// otherwise told about live? A SCHEDULED hold stays "pending" only while its
// payment window hasn't lapsed yet — the moment it expires there's nothing
// left to poll for here: the server's own lazy-expiry mechanism
// (reservations.service.ts) transitions it to CANCELLED the next time it's
// read, and the once-daily mercadopago-hold-sweep/bank-transfer-hold-sweep
// crons are the backstop for a hold nobody ever comes back to look at.
// Undefined input (query hasn't resolved yet) is treated as "nothing
// pending" rather than "poll immediately" — same as an empty list.
export function hasPendingPaymentHold(
  reservations: PlayerReservation[] | undefined,
): boolean {
  if (!reservations) return false;
  return reservations.some(
    (reservation) =>
      reservation.status === "SCHEDULED" &&
      (!reservation.paymentExpiresAt ||
        reservation.paymentExpiresAt.getTime() > Date.now()),
  );
}

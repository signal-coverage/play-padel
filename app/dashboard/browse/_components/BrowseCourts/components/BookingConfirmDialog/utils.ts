import { formatCurrency } from "@/lib/utils/currency";
import type { BookingPaymentState } from "./types";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Own line from the time range on purpose — combined into one string, a
 * long court name above it left too little width and wrapped mid-phrase. */
export function formatSlotDate(start: Date): string {
  return start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatSlotTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/**
 * A court priced at exactly 0 is deliberately free and books instantly — `0`
 * and "not set" are never the same thing. Every other priced court requires
 * payment before the reservation is confirmed, regardless of any club-level
 * setting. An unset price blocks booking instead of silently letting it
 * through as free (mirrors the server-side check in
 * app/api/player/reservations/route.ts).
 */
export function getBookingPaymentState(
  price: number | undefined,
): BookingPaymentState {
  if (price === 0) return { kind: "free" };
  if (typeof price === "number") return { kind: "pay-now", price };
  return { kind: "price-missing" };
}

export function getBookingConfirmMessage(
  state: BookingPaymentState,
  currency: string,
): string {
  switch (state.kind) {
    case "pay-now":
      return `This reservation requires payment to be confirmed. You'll pay ${formatCurrency(state.price, currency)} via Mercado Pago — you'll be redirected to complete it, and your slot is held for 15 minutes.`;
    case "free":
      return "This court is free — no payment needed. You can cancel for free up to 2 hours before your reservation.";
    case "price-missing":
      return "This court doesn't have a price set yet, so it can't be booked online — contact the club directly.";
  }
}

export function canConfirmBooking(state: BookingPaymentState): boolean {
  return state.kind !== "price-missing";
}

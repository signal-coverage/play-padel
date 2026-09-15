import { formatCurrency } from "@/lib/utils/currency";
import type { ReservationPaymentMethod } from "@/core/reservations/types";
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

// `t` comes from the caller's own "BookingConfirmDialog" translations
// (getBookingConfirmMessage is a plain util, not a component, so it can't
// call useTranslations itself) — BookingConfirmDesktopDialog and
// BookingConfirmMobileDrawer both pass their own useTranslations result.
export function getBookingConfirmMessage(
  state: BookingPaymentState,
  currency: string,
  selectedMethod: ReservationPaymentMethod | null,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  switch (state.kind) {
    case "pay-now":
      if (selectedMethod === "TRANSFER") {
        return t("payNowTransfer", {
          amount: formatCurrency(state.price, currency),
        });
      }
      return t("payNowMercadoPago", {
        amount: formatCurrency(state.price, currency),
      });
    case "free":
      return t("free");
    case "price-missing":
      return t("priceMissing");
  }
}

export function canConfirmBooking(state: BookingPaymentState): boolean {
  return state.kind !== "price-missing";
}

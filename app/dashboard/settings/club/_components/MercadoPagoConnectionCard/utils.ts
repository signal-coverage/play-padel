import type { MercadoPagoOperationalStatus } from "./types";

export type MercadoPagoConnectionCopy = {
  badgeLabel: string;
  badgeVariant: "success" | "warning" | "destructive";
  description: string;
  ctaLabel: string;
};

/**
 * Maps the operational-status endpoint's `{ operational, cause }` shape to
 * the card's badge/description/CTA copy. Precedence mirrors
 * lib/mercadopago/operationalStatus.ts: MP_NOT_CONNECTED is checked before
 * CLUB_INACTIVE, and the connect route (Phase 2) is reused as-is for both
 * "Connect" and "Reconnect" — the button always points at the same OAuth
 * flow.
 */
export function getMercadoPagoConnectionCopy(
  status?: MercadoPagoOperationalStatus,
): MercadoPagoConnectionCopy {
  if (!status) {
    return {
      badgeLabel: "Loading…",
      badgeVariant: "warning",
      description: "Checking your Mercado Pago connection…",
      ctaLabel: "Connect Mercado Pago",
    };
  }

  if (status.cause === "MP_NOT_CONNECTED") {
    return {
      badgeLabel: "Not connected",
      badgeVariant: "destructive",
      description:
        "Connect your Mercado Pago account so players can pay for court reservations directly to you.",
      ctaLabel: "Connect Mercado Pago",
    };
  }

  if (status.cause === "CLUB_INACTIVE") {
    return {
      badgeLabel: "Connected",
      badgeVariant: "warning",
      description:
        "Mercado Pago is connected, but your club membership isn't active — reactivate it to resume accepting payments.",
      ctaLabel: "Reconnect Mercado Pago",
    };
  }

  return {
    badgeLabel: "Connected",
    badgeVariant: "success",
    description:
      "Mercado Pago is connected. Players pay you directly for court reservations.",
    ctaLabel: "Reconnect Mercado Pago",
  };
}

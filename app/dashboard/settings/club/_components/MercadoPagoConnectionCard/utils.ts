import type { MercadoPagoOperationalStatus } from "./types";

export type MercadoPagoConnectionCopy = {
  badgeLabel: string;
  badgeVariant: "success" | "warning" | "destructive";
  description: string;
  ctaLabel: string;
  // Whether a live Mercado Pago connection actually exists for this club,
  // i.e. there is something to unlink. True for CLUB_INACTIVE and the fully
  // connected case; false while loading and for MP_NOT_CONNECTED (nothing
  // to disconnect yet).
  showDisconnect: boolean;
  // Human-readable identity of the connected Mercado Pago account, e.g.
  // "clubowner (owner@club.com)". Null while loading, for MP_NOT_CONNECTED,
  // and whenever neither an email nor a nickname was fetched at connect
  // time (see lib/mercadopago/oauth.ts's fetchMercadoPagoUserProfile).
  accountLabel: string | null;
};

function buildAccountLabel(
  status: MercadoPagoOperationalStatus,
): string | null {
  if (status.nickname && status.email) {
    return `${status.nickname} (${status.email})`;
  }
  return status.nickname ?? status.email ?? null;
}

/**
 * Maps the operational-status endpoint's `{ operational, cause }` shape to
 * the card's badge/description/CTA copy. Precedence mirrors
 * lib/mercadopago/operationalStatus.ts: MP_NOT_CONNECTED is checked before
 * CLUB_INACTIVE.
 *
 * The connect route (Phase 2) is reused as-is for both "Connect" and
 * "Switch account" — the button always points at the same OAuth flow;
 * connecting again with a different Mercado Pago account overwrites the
 * existing row (see the callback route's upsert). "Switch account" is
 * intentionally distinct from disconnecting: it never claims to revoke
 * anything on Mercado Pago's side, since there is no API for that — see
 * the disconnect route (Phase, app/api/clubs/mercadopago/disconnect) for
 * the local-only "unlink" action.
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
      showDisconnect: false,
      accountLabel: null,
    };
  }

  if (status.cause === "MP_NOT_CONNECTED") {
    return {
      badgeLabel: "Not connected",
      badgeVariant: "destructive",
      description:
        "Connect your Mercado Pago account so players can pay for court reservations directly to you.",
      ctaLabel: "Connect Mercado Pago",
      showDisconnect: false,
      accountLabel: null,
    };
  }

  if (status.cause === "CLUB_INACTIVE") {
    return {
      badgeLabel: "Connected",
      badgeVariant: "warning",
      description:
        "Mercado Pago is connected, but your club membership isn't active — reactivate it to resume accepting payments.",
      ctaLabel: "Switch account",
      showDisconnect: true,
      accountLabel: buildAccountLabel(status),
    };
  }

  return {
    badgeLabel: "Connected",
    badgeVariant: "success",
    description:
      "Mercado Pago is connected. Players pay you directly for court reservations.",
    ctaLabel: "Switch account",
    showDisconnect: true,
    accountLabel: buildAccountLabel(status),
  };
}

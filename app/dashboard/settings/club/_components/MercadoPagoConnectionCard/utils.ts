import type { MercadoPagoOperationalStatus } from "./types";

// `t` comes from the caller's own useTranslations("MercadoPagoConnectionCard")
// result — this is a plain util, not a component, so it can't call
// useTranslations itself.
export type MercadoPagoConnectionCardT = (key: string) => string;

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
  status: MercadoPagoOperationalStatus | undefined,
  t: MercadoPagoConnectionCardT,
): MercadoPagoConnectionCopy {
  if (!status) {
    return {
      badgeLabel: t("loadingBadge"),
      badgeVariant: "warning",
      description: t("loadingDescription"),
      ctaLabel: t("connectCta"),
      showDisconnect: false,
      accountLabel: null,
    };
  }

  if (status.cause === "MP_NOT_CONNECTED") {
    return {
      badgeLabel: t("notConnectedBadge"),
      badgeVariant: "destructive",
      description: t("notConnectedDescription"),
      ctaLabel: t("connectCta"),
      showDisconnect: false,
      accountLabel: null,
    };
  }

  if (status.cause === "CLUB_INACTIVE") {
    return {
      badgeLabel: t("connectedBadge"),
      badgeVariant: "warning",
      description: t("clubInactiveDescription"),
      ctaLabel: t("switchAccountCta"),
      showDisconnect: true,
      accountLabel: buildAccountLabel(status),
    };
  }

  return {
    badgeLabel: t("connectedBadge"),
    badgeVariant: "success",
    description: t("connectedDescription"),
    ctaLabel: t("switchAccountCta"),
    showDisconnect: true,
    accountLabel: buildAccountLabel(status),
  };
}

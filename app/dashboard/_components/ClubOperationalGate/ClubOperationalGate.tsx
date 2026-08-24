"use client";

import type { ClubOperationalGateProps } from "./types";
import { useClubOperationalStatus } from "./hooks";
import { PaymentActivationScreen } from "./components/PaymentActivationScreen";
import { ClubInactiveCard } from "./components/ClubInactiveCard";

/**
 * Gate for the non-operational club owner dashboard (spec domain:
 * club-operational-gate-overlay). Renders `children` untouched when
 * operational (or while the status fetch is still in flight, so the
 * dashboard never flashes a gate before we actually know the club's state).
 *
 * When non-operational, `children` are NOT rendered at all — React never
 * mounts that subtree, so none of the underlying page's data-fetching hooks
 * ever fire for a dashboard the owner can't use yet. A cause-specific gate
 * screen renders directly in the page-content slot instead, as plain page
 * content (no blur, no portal, no overlay).
 *
 * Precedence between the two non-operational causes is resolved server-side
 * by getClubOperationalStatus() (see lib/mercadopago/operationalStatus.ts) —
 * this component only switches on the single `cause` value it receives, it
 * does not re-derive precedence itself.
 */
export function ClubOperationalGate({ children }: ClubOperationalGateProps) {
  const { data: status, isLoading } = useClubOperationalStatus();

  if (isLoading || !status || status.operational) {
    return <>{children}</>;
  }

  return status.cause === "MP_NOT_CONNECTED" ? (
    <PaymentActivationScreen />
  ) : (
    <ClubInactiveCard />
  );
}

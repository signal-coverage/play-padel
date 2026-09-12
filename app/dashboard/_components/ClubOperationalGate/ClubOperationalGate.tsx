"use client";

import { BouncingBall } from "@/components/BouncingBall";
import type { ClubOperationalGateProps } from "./types";
import { useClubOperationalStatus } from "./hooks";
import { PaymentActivationScreen } from "./components/PaymentActivationScreen";
import { ClubInactiveCard } from "./components/ClubInactiveCard";
import { PendingApprovalCard } from "./components/PendingApprovalCard";

/**
 * Gate for the non-operational club owner dashboard (spec domain:
 * club-operational-gate-overlay). Renders `children` only once the status
 * fetch has actually resolved as operational — while it's still in flight,
 * this shows a neutral spinner instead of either the real dashboard or a
 * gate screen.
 *
 * This deliberately flips an earlier version of this gate, which rendered
 * `children` during the loading window too (reasoning: avoid flashing a
 * gate screen for a club that turns out to be operational). In practice
 * that traded one flash for a worse one — a non-operational club's owner
 * would see the real dashboard for a moment before the gate screen replaced
 * it. A brief neutral spinner is the only option that never flashes the
 * WRONG state in either direction, at the cost of a short spinner even for
 * already-operational clubs.
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

  if (isLoading) {
    // Fills the gate's full slot height, same shell GateScreen uses for the
    // other non-operational states below — StatusBox is a padded, bordered
    // card sized to its own content, not the page-content area, so the ball
    // sat high instead of centered in the middle of the dashboard.
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <BouncingBall size={32} amplitude={16} />
        <span className="sr-only">Loading dashboard…</span>
      </div>
    );
  }

  // Fails open on error (`!status`) — same as before: an owner who already
  // has an operational club shouldn't get locked out by a flaky status
  // check, only a genuinely non-operational one should ever see a gate.
  // No FREE-plan bypass here (deliberately removed): a real payout method
  // (Mercado Pago or bank transfer) is required before any owner reaches
  // dashboard content, regardless of plan — connecting one is a required
  // step, not an optional one a FREE plan can skip.
  if (!status || status.operational) {
    return <>{children}</>;
  }

  if (status.cause === "MP_NOT_CONNECTED") {
    return <PaymentActivationScreen />;
  }
  if (status.cause === "PENDING_APPROVAL") {
    return <PendingApprovalCard />;
  }
  return <ClubInactiveCard />;
}

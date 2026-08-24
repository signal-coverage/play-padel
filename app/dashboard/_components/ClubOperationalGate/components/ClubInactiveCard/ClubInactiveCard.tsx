"use client";

import { GateScreen } from "../GateScreen";

// Cause B from spec's club-operational-gate-overlay domain: Club.status is
// not ACTIVE. Message-only by design — no renewal flow exists yet (out of
// scope for this change, see design.md's Open Questions), so the CTA is
// disabled rather than linking anywhere. Rendered as the dashboard's
// page-content via the shared GateScreen shell, like the other cause, for a
// consistent gate experience across both.
export function ClubInactiveCard() {
  return (
    <GateScreen
      title="Renew your membership"
      description="Your club membership isn't active. Renew it to keep managing courts and accepting reservations."
      submitLabel="Renew membership"
      submitDisabled
    />
  );
}

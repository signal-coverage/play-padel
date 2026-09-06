import { GateScreen } from "../GateScreen";

// New club-operational-gate cause: PENDING_APPROVAL (see
// lib/mercadopago/operationalStatus.ts). Mirrors ClubInactiveCard's
// structure/styling, but purely informational — an owner cannot self-approve
// their own club, so this renders no submit action at all (GateScreen omits
// its bottom button row entirely when submitLabel is not provided).
export function PendingApprovalCard() {
  return (
    <GateScreen
      title="Your club is under review"
      description="We'll notify you once it's approved. Until then, you can't accept reservations."
    />
  );
}

export type ConfirmedPanelProps = {
  onClose: () => void;
  // True when the underlying subscription's status is TRIALING rather than
  // ACTIVE — most relevant for an ANNUAL trial (started via `startTrial`
  // with NO Mercado Pago object at all, see
  // app/api/clubs/membership/route.ts's ANNUAL branch), where "your
  // membership payment is confirmed" would be actively misleading since no
  // payment method was ever authorized. Defaults to `false` (paid/ACTIVE
  // copy) when omitted.
  isTrialing?: boolean;
  // True only for an ANNUAL trial (isTrialing + cycle === "ANNUAL") — shows
  // a "Pay Now" action so the owner can generate the one-time payment link
  // and convert before the cron sweep cancels the trial at `trialEndsAt`
  // (sdd-verify follow-up fix: this is the ONLY way an ANNUAL trial can
  // ever reach ACTIVE without simply waiting for the trial to expire and
  // be cancelled). A MONTHLY trial never needs this — it already has an
  // authorized preapproval on file. Defaults to `false` when omitted.
  showPayNow?: boolean;
  onPayNow?: () => void;
  isPayNowLoading?: boolean;
  payNowError?: string | null;
};

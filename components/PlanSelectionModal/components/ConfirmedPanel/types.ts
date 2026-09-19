export type ConfirmedPanelProps = {
  onClose: () => void;
  // True when the underlying subscription's status is TRIALING rather than
  // ACTIVE — both cycles reach TRIALING with an authorized-but-uncharged
  // Mercado Pago preapproval on file, where "your membership payment is
  // confirmed" would be actively misleading since no charge has happened
  // yet. Defaults to `false` (paid/ACTIVE copy) when omitted.
  isTrialing?: boolean;
  // Lets the owner change plan tier IMMEDIATELY, valid while TRIALING on
  // EITHER cycle — neither cycle has been charged yet during a trial, so
  // there's nothing to lose by switching tiers before the first real
  // charge. Undefined hides the button entirely.
  onChangePlan?: () => void;
  isChangingPlan?: boolean;
  changePlanError?: string | null;
};

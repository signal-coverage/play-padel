export type AwaitingConfirmationPanelProps = {
  onRefresh: () => void;
  isRefreshing: boolean;
  // Not currently passed by PlanSelectionModal — both membership billing
  // cycles now collect the card in-place via the Brick (see
  // MembershipCheckoutDrawer), so no external tab is ever opened for
  // membership checkout anymore. Kept as a general-purpose prop for any
  // other flow that does open a hosted external checkout tab and wants
  // this same fallback message shown while waiting for it.
  openedExternalTab?: boolean;
};

export type AwaitingConfirmationPanelProps = {
  onRefresh: () => void;
  isRefreshing: boolean;
  // True only for the ANNUAL flow, which opens Mercado Pago's hosted
  // checkout in a new browser tab (`window.open`). MONTHLY collects the
  // card in-place via the Brick, so no tab is ever opened for it. When
  // true, we show a fallback message: PlanSelectionModal's own tab-close
  // effect is best-effort (a script-opened window can normally always be
  // closed by its opener, but this stays defensive since MP's hosted page
  // is outside our control), so the owner needs a manual way out if it
  // doesn't fire.
  openedExternalTab?: boolean;
};

import type { CardTokenResult } from "../CardTokenForm/types";

export type MembershipCheckoutDrawerView =
  "collect-card" | "awaiting-confirmation";

export type MembershipCheckoutDrawerProps = {
  open: boolean;
  view: MembershipCheckoutDrawerView;
  amount: number;
  payerEmail: string;
  // The owner's own account email (from Clerk) — passed through to
  // CardCollectionPanel to pre-fill its draft field. See that component's
  // own `defaultEmail` prop.
  defaultEmail?: string;
  checkoutError: string | null;
  isSubmitting: boolean;
  isRefreshing: boolean;
  onOpenChange: (open: boolean) => void;
  onPayerEmailChange: (email: string) => void;
  onTokenReady: (result: CardTokenResult) => void;
  onCardError: (message: string) => void;
  onBack: () => void;
  onRefresh: () => void;
};

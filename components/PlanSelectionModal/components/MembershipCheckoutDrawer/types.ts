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
  // Prefills the Brick's identification field via CardTokenForm — either the
  // subscription's own previously-saved identification, or (when none is
  // saved yet) the club's own onboarding-collected `Club.taxId`. `undefined`
  // when neither is known — in that case the "Save this ID for future
  // payments" checkbox below is not shown either, since there is nothing to
  // offer saving.
  identification?: { type: string; number: string };
  saveIdentification: boolean;
  onSaveIdentificationChange: (checked: boolean) => void;
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

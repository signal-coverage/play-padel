export type CardTokenResult = {
  cardTokenId: string;
};

export type CardTokenFormProps = {
  // The amount to show in the Brick (informational — MP does not charge it
  // here; the actual charge happens server-side when
  // `createMembershipPreapproval` uses the resulting card token).
  amount: number;
  // Pre-fills the Brick's payer email field, when known.
  payerEmail?: string;
  onTokenReady: (result: CardTokenResult) => void;
  onError: (message: string) => void;
};

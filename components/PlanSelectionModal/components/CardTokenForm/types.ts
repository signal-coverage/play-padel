export type CardTokenResult = {
  cardTokenId: string;
  // Whatever identification the owner actually confirmed in the Brick
  // (prefilled-and-kept, or manually corrected) — round-tripped from the
  // Brick's own `onSubmit` payload, mirroring `ICardPaymentFormData.payer`
  // (see @mercadopago/sdk-react's CardPayment Brick types). Only present
  // when the Brick's submit actually returned one.
  identification?: { type: string; number: string };
};

export type CardTokenFormProps = {
  // The amount to show in the Brick (informational — MP does not charge it
  // here; the actual charge happens server-side when
  // `createMembershipPreapproval` uses the resulting card token).
  amount: number;
  // Pre-fills the Brick's payer email field, when known.
  payerEmail?: string;
  // Pre-fills the Brick's identification (DNI/CUIT) field, when known — see
  // `ICardPaymentBrickPayer.identification`
  // (node_modules/@mercadopago/sdk-react/esm/bricks/util/types/common.d.ts).
  // A convenience default only: the owner can freely overwrite it before
  // submitting, and nothing is ever persisted from it without a separate,
  // explicit opt-in (MembershipCheckoutDrawer's "Save this ID for future
  // payments" checkbox).
  identification?: { type: string; number: string };
  onTokenReady: (result: CardTokenResult) => void;
  onError: (message: string) => void;
};

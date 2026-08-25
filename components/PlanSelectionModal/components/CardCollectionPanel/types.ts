import type { CardTokenResult } from "../CardTokenForm/types";

export type CardCollectionPanelProps = {
  amount: number;
  payerEmail: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onPayerEmailChange: (email: string) => void;
  onTokenReady: (result: CardTokenResult) => void;
  onCardError: (message: string) => void;
  onBack: () => void;
};

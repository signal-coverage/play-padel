export type ClubBankTransferAccount = {
  bankName: string;
  cbu: string;
  alias: string | null;
  accountHolderName: string | null;
};

export type BankTransferAccountFormValues = {
  bankName: string;
  cbu: string;
  alias: string;
  accountHolderName: string;
};

export type BankTransferAccountSettingsCardProps = {
  // Default "Save changes". The Mercado Pago connected popup passes
  // "Save and continue" instead.
  submitLabel?: string;
  // Default false. When true, the submit button is enabled even with an
  // empty/invalid form — Mercado Pago being already connected already
  // satisfies the "at least one payout method" requirement, so filling this
  // in is a pure bonus, never a blocker.
  allowSkip?: boolean;
  // Called after either (a) a successful save, or (b) an explicit
  // skip-click (submit clicked with an invalid/empty form while
  // `allowSkip` is true — no network call is made in that case). Lets a
  // containing popup close itself. Never called on a failed save.
  onDone?: () => void;
};

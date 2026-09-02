export type CardCollectionPanelProps = {
  payerEmail: string;
  // The owner's own account email (from Clerk) — pre-fills the draft field
  // so most owners can just click Verify, without forcing it: still a
  // plain editable default, not a locked/verified value.
  defaultEmail?: string;
  onPayerEmailChange: (email: string) => void;
};

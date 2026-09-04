import type { ReactNode } from "react";

export type GateScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
  // Width of the outer container (e.g. "max-w-6xl" for a wide multi-card
  // grid). Previously mapped to GateDialog's DialogContent width; now maps
  // directly to this screen's own wrapping element instead.
  contentClassName?: string;
  // Both optional: the bottom submit-button row only renders when
  // submitLabel is provided (see GateScreen.tsx) — a cause screen with no
  // single primary action (e.g. PaymentActivationScreen, which now offers
  // two independent payout-method cards instead of one CTA) omits both.
  submitLabel?: string;
  submitDisabled?: boolean;
  onSubmit?: () => void;
};

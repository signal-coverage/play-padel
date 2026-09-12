// Fixed four-step flow for this modal, same reasoning as
// PaymentStepIndicator's own PAYMENT_STEP_LABELS: it never has more than
// these steps, so they're hardcoded rather than threaded through as a prop.
// Split from the original two (Details/Availability) so each step fits
// without its own vertical scroll: Details is now just name+photo,
// Attributes holds every physical characteristic, Pricing is its own step,
// and Availability is unchanged.
export const COURT_FORM_STEP_LABELS = [
  "Details",
  "Attributes",
  "Pricing",
  "Availability",
] as const;

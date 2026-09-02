// Fixed two-step flow for this sheet, same reasoning as
// PaymentStepIndicator's own PAYMENT_STEP_LABELS: it never has more than
// these two steps, so they're hardcoded rather than threaded through as a
// prop.
export const COURT_FORM_STEP_LABELS = ["Details", "Availability"] as const;
